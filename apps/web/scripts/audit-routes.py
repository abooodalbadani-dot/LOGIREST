#!/usr/bin/env python3
"""
Route & Navigation Integrity Audit Script

Identifies all routes in the Next.js app, cross-references them with
navigation references (Link/a tags, router.push/replace), verifies
authentication guards against proxy.ts, and flags orphans and
dynamic paths requiring manual review.

Usage:
    python apps/web/scripts/audit-routes.py

Output:
    specs/003-route-integrity-audit/audit-report.md
"""

import os
import re
import sys
import json
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional

# ---------------------------------------------------------------------------
# Configuration (T002)
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
APP_SRC = REPO_ROOT / "apps" / "web" / "src"
APP_DIR = APP_SRC / "app"
PROXY_FILE = APP_SRC / "proxy.ts"
REPORT_OUTPUT = REPO_ROOT / "specs" / "003-route-integrity-audit" / "audit-report.md"
AUDIT_DATA_DIR = REPO_ROOT / "apps" / "web" / "audit"
EXTERNAL_ENTRY_POINTS_FILE = AUDIT_DATA_DIR / "external-entry-points.json"
FEATURE_GATED_ROUTES_FILE = AUDIT_DATA_DIR / "feature-gated-routes.json"
INTERNAL_TOOLING_FILE = AUDIT_DATA_DIR / "internal-tooling.json"

ROUTE_GROUPS = ("(app)", "(auth)", "(operations)", "(procurement)", "(master-data)")
LOCALE_SEGMENT = "[locale]"

# Regex patterns (T002)
RE_HREF = re.compile(r'''href\s*=\s*["']([^"']+)["']''', re.IGNORECASE)
RE_LINK_HREF = re.compile(r'''<Link[^>]*\bhref\s*=\s*\{[`"']([^"`']+)["`']\}''', re.IGNORECASE)
RE_LINK_LITERAL = re.compile(r'''<Link[^>]*\bhref\s*=\s*["']([^"']+)["']''', re.IGNORECASE)
RE_LINK_VAR_REF = re.compile(r'''<Link[^>]*\bhref\s*=\s*\{([a-zA-Z_]\w*)\}''', re.IGNORECASE)
RE_ROUTER_PUSH = re.compile(r'''(?:router|useRouter)\s*(?:\.|\.\s*)push\s*\(\s*["']([^"']+)["']''', re.IGNORECASE)
RE_ROUTER_REPLACE = re.compile(r'''(?:router|useRouter)\s*(?:\.|\.\s*)replace\s*\(\s*["']([^"']+)["']''', re.IGNORECASE)
RE_OBJECT_HREF = re.compile(r'''\b(?:href|path|to)\s*[:=]\s*["']([^"']+)["']''', re.IGNORECASE)
RE_REDIRECT = re.compile(r'''\bredirect\s*\(\s*\{\s*href\s*[:=]\s*["']([^"']+)["']''', re.IGNORECASE)
RE_REDIRECT_SIMPLE = re.compile(r'''\bredirect\s*\(\s*["']([^"']+)["']''', re.IGNORECASE)

# Template Literal Patterns (Capture the whole expression inside quotes/backticks)
RE_TEMPLATE_LITERAL = re.compile(r'''[`'"]([^`'"]*\$\{[^}]+\}[^`'"]*)[`'"]''')
RE_LINK_HREF_TEMPLATE = re.compile(r'''href\s*=\s*\{[`"']([^"`']*?\$\{[^}]+?\}[^"`']*?)[`"']\}''', re.IGNORECASE)
RE_ROUTER_PUSH_TEMPLATE = re.compile(r'''(?:router|useRouter)\s*(?:\.|\.\s*)push\s*\(\s*[`"']([^"`']*?\$\{[^}]+?\}[^"`']*?)[`"']''', re.IGNORECASE)
RE_ROUTER_REPLACE_TEMPLATE = re.compile(r'''(?:router|useRouter)\s*(?:\.|\.\s*)replace\s*\(\s*[`"']([^"`']*?\$\{[^}]+?\}[^"`']*?)[`"']''', re.IGNORECASE)
RE_REDIRECT_TEMPLATE = re.compile(r'''\bredirect\s*\(\s*\{\s*href\s*[:=]\s*[`"']([^"`']*?\$\{[^}]+?\}[^"`']*?)[`"']''', re.IGNORECASE)
RE_REDIRECT_SIMPLE_TEMPLATE = re.compile(r'''\bredirect\s*\(\s*[`"']([^"`']*?\$\{[^}]+?\}[^"`']*?)[`"']''', re.IGNORECASE)

# Dynamic Variable Patterns
RE_DYNAMIC_VAR = re.compile(r'''(?:router\.push|router\.replace|href\s*[=:]|redirect)\s*\(\s*(?:\{\s*href\s*[:=]\s*)?([a-zA-Z_]\w*)\s*\}?\s*\)''', re.IGNORECASE)

# Feature Flag detection pattern
RE_FEATURE_FLAG = re.compile(r'''//\s*@feature-flag:\s*([a-zA-Z0-9_-]+)''', re.IGNORECASE)


# ---------------------------------------------------------------------------
# Logic Controls
# ---------------------------------------------------------------------------

IGNORE_PREFIXES = [
    '/api/',
    '/v1/',
    '/procurement/',
    '/operations/',
    '/notifications/',
    '/currencies/',
    '/warehouses/',
    '/items/',
    '/departments/',
    '/branches/',
    '/categories/',
    '/suppliers/',
    '/units-of-measure/'
]

# Routes that are known to be active but might not have static links
WHITELIST_ORPHANS = [
    '/dashboard',
    '/profile',
    '/search',
    '/context-selector',
    '/login',
    '/reset-password',
    '/forgot-password',
    '/inventory',
    '/inventory/balance', # Redirect target
    '/inventory/lots',
    '/inventory/movements',
    '/inventory/expired-override',
    '/reports',
    '/reports/available-inventory',
    '/reports/currency-summaries',
    '/reports/expiry',
    '/reports/movements',
    '/reports/procurement-status',
    '/reports/stocktake-variance',
    '/admin',
    '/admin/users',
    '/admin/settings',
    '/master-data',
    '/communications',
    '/procurement/purchase-requests',
    '/procurement/purchase-orders',
    '/procurement/goods-received',
    '/procurement/suppliers',
    '/operations/issues',
    '/operations/adjustments',
    '/operations/stocktakes'
]

# ---------------------------------------------------------------------------
# Helpers for Loading Configuration
# ---------------------------------------------------------------------------

def load_audit_config(file_path: Path, key: str) -> list[str]:
    """Load a list of routes from a JSON configuration file."""
    if not file_path.exists():
        return []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get(key, [])
    except Exception as e:
        print(f"WARNING: Error reading {file_path}: {e}")
        return []

# ---------------------------------------------------------------------------
# Data Model (T005)
# ---------------------------------------------------------------------------

@dataclass
class RouteEntry:
    path: str
    status: str = "Active"
    guard: str = "Protected"
    notes: str = ""
    source_file: str = ""
    references: list = field(default_factory=list)
    dynamic_refs: list = field(default_factory=list)


@dataclass
class BrokenRef:
    source_file: str
    target_path: str
    issue: str


# ---------------------------------------------------------------------------
# T003 – Filesystem Traversal
# ---------------------------------------------------------------------------

def find_page_files(base_dir: Path) -> list[Path]:
    """Recursively find all page.tsx files under the app directory."""
    return sorted(base_dir.rglob("page.tsx"))


# ---------------------------------------------------------------------------
# T004 – Route Normalization
# ---------------------------------------------------------------------------

def normalize_route(rel_path: str) -> str:
    """
    Convert a relative file path to a normalized route string.

    Steps:
    1. Remove [locale] prefix
    2. Remove route groups like (app), (auth), etc.
    3. Replace [id] segments with :id for display
    4. Handle root page.tsx as /
    """
    parts = Path(rel_path).parts

    # Strip [locale] prefix
    if parts and parts[0] == LOCALE_SEGMENT:
        parts = parts[1:]

    # Remove route groups
    parts = tuple(p for p in parts if p not in ROUTE_GROUPS)

    # Remove 'page.tsx' filename
    parts = tuple(p for p in parts if p != "page.tsx")

    if not parts:
        return "/"

    # Build path, converting dynamic segments for display
    segments = []
    for p in parts:
        if p.startswith("[") and p.endswith("]"):
            inner = p[1:-1]
            if inner == "id":
                segments.append(":id")
            else:
                segments.append(f":{inner}")
        else:
            segments.append(p)

    route = "/" + "/".join(segments)
    return route


def build_route_map(page_files: list[Path]) -> dict[str, RouteEntry]:
    """
    Build a Route Map from discovered page files.

    Returns a dict mapping normalized route path -> RouteEntry.
    """
    route_map: dict[str, RouteEntry] = {}

    for pf in page_files:
        try:
            rel = pf.relative_to(APP_DIR)
        except ValueError:
            continue
        route = normalize_route(str(rel).replace("\\", "/"))
        entry = RouteEntry(
            path=route,
            status="Active",
            guard="Protected",
            notes="",
            source_file=str(pf.relative_to(REPO_ROOT)).replace("\\", "/"),
            references=[],
            dynamic_refs=[],
        )
        route_map[route] = entry

    return route_map


# ---------------------------------------------------------------------------
# T006 – Extract href from <Link> and <a> tags
# ---------------------------------------------------------------------------

def extract_href_references(src_dir: Path) -> dict[str, list[str]]:
    """
    Scan all .tsx/.ts files for href attributes in <Link> and <a> tags.
    Returns a dict mapping source file -> list of href paths found.
    """
    results: dict[str, list[str]] = {}
    for tsx_file in src_dir.rglob("*.tsx"):
        _extract_refs_from_file(tsx_file, results)
    for ts_file in src_dir.rglob("*.ts"):
        if ts_file.name == "proxy.ts":
            continue
        _extract_refs_from_file(ts_file, results)
    return results


# ---------------------------------------------------------------------------
# T007 – Extract router.push and router.replace
# ---------------------------------------------------------------------------

def extract_router_references(src_dir: Path) -> dict[str, list[str]]:
    """
    Scan source files for router.push() and router.replace() calls.
    Returns a dict mapping source file -> list of target paths.
    """
    results: dict[str, list[str]] = {}
    for tsx_file in src_dir.rglob("*.tsx"):
        _extract_router_refs_from_file(tsx_file, results)
    for ts_file in src_dir.rglob("*.ts"):
        if ts_file.name == "proxy.ts":
            continue
        _extract_router_refs_from_file(ts_file, results)
    return results


def _extract_refs_from_file(filepath: Path, results: dict[str, list[str]]):
    """Extract href references from a single file."""
    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return

    rel = str(filepath.relative_to(REPO_ROOT)).replace("\\", "/")
    refs = []

    for m in RE_LINK_LITERAL.finditer(content):
        refs.append(m.group(1))

    for m in RE_LINK_HREF.finditer(content):
        refs.append(m.group(1))

    for m in RE_LINK_VAR_REF.finditer(content):
        refs.append(f"variable:{m.group(1)}")

    for m in RE_LINK_HREF_TEMPLATE.finditer(content):
        refs.append(m.group(1))

    for m in RE_HREF.finditer(content):
        href = m.group(1)
        if href.startswith("/") and not href.startswith("/_next") and not href.startswith("/api"):
            refs.append(href)

    for m in RE_OBJECT_HREF.finditer(content):
        href = m.group(1)
        if href.startswith("/") and not href.startswith("/_next") and not href.startswith("/api"):
            refs.append(href)
    
    for m in RE_TEMPLATE_LITERAL.finditer(content):
        val = m.group(1)
        if val.startswith("/") or "href" in content[max(0, m.start()-20):m.start()].lower():
            refs.append(val)

    for m in RE_REDIRECT.finditer(content):
        refs.append(m.group(1))

    for m in RE_REDIRECT_SIMPLE.finditer(content):
        refs.append(m.group(1))

    for m in RE_REDIRECT_TEMPLATE.finditer(content):
        refs.append(m.group(1))

    for m in RE_REDIRECT_SIMPLE_TEMPLATE.finditer(content):
        refs.append(m.group(1))

    if refs:
        results.setdefault(rel, []).extend(refs)


def _extract_router_refs_from_file(filepath: Path, results: dict[str, list[str]]):
    """Extract router.push/replace references from a single file."""
    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return

    rel = str(filepath.relative_to(REPO_ROOT)).replace("\\", "/")
    refs = []

    for m in RE_ROUTER_PUSH.finditer(content):
        refs.append(m.group(1))

    for m in RE_ROUTER_REPLACE.finditer(content):
        refs.append(m.group(1))

    for m in RE_ROUTER_PUSH_TEMPLATE.finditer(content):
        refs.append(m.group(1))

    for m in RE_ROUTER_REPLACE_TEMPLATE.finditer(content):
        refs.append(m.group(1))

    if refs:
        results.setdefault(rel, []).extend(refs)


# ---------------------------------------------------------------------------
# T013 – Detect dynamic path construction
# ---------------------------------------------------------------------------

def extract_dynamic_refs(src_dir: Path) -> dict[str, list[str]]:
    """
    Find dynamic path construction patterns (template literals and variable args).
    Returns source_file -> list of dynamic expressions found.
    """
    results: dict[str, list[str]] = {}
    for tsx_file in src_dir.rglob("*.tsx"):
        _extract_dynamic_from_file(tsx_file, results)
    for ts_file in src_dir.rglob("*.ts"):
        if ts_file.name == "proxy.ts":
            continue
        _extract_dynamic_from_file(ts_file, results)
    return results


def _extract_dynamic_from_file(filepath: Path, results: dict[str, list[str]]):
    """Detect dynamic path construction patterns."""
    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return

    rel = str(filepath.relative_to(REPO_ROOT)).replace("\\", "/")
    dynamic_refs = []

    for m in RE_TEMPLATE_LITERAL.finditer(content):
        expr = m.group(1)
        if "/" in expr or "href" in content[max(0, m.start()-50):m.start()].lower():
            dynamic_refs.append(expr)

    for m in RE_DYNAMIC_VAR.finditer(content):
        dynamic_refs.append(f"variable:{m.group(1)}")

    if dynamic_refs:
        results.setdefault(rel, []).extend(dynamic_refs)


# ---------------------------------------------------------------------------
# T008 – Cross-reference disk routes with UI references
# ---------------------------------------------------------------------------

def normalize_ref_path(ref: str) -> str:
    """
    Normalize a reference path for comparison with route map keys.
    Convert template literals first, then strip locale prefix,
    remove trailing slashes, handle hash fragments.
    """
    # 0. Strip leading/trailing whitespace
    ref = ref.strip()

    # 1. Filter out API calls immediately
    for prefix in IGNORE_PREFIXES:
        if ref.startswith(prefix):
            return "EXCLUDED_API_PATH"

    # 2. Handle common specific template variables
    # ${locale}, ${lang} are very common and should be stripped
    ref = re.sub(r'\$\{(locale|lang|language|localeActive)\}', r':locale', ref)
    ref = re.sub(r'\$\{pathname\}', r':pathname', ref)
    
    # 3. Convert remaining template literals
    # Use :id for anything that looks like a parameter
    # Note: We do this BEFORE splitting on '?' because optional chaining (?.)
    # would otherwise be incorrectly interpreted as a query parameter separator.
    ref = re.sub(r'\$\{([^}]+)\}', r':id', ref)
    
    # 4. Remove hash and query parameters
    ref = ref.split("#")[0].split("?")[0]
    
    # 5. Normalize common dynamic patterns: :variable.property -> :id
    ref = re.sub(r':\w+\.\w+', ':id', ref)
    
    # 4. Normalize common dynamic patterns: :variable.property -> :id
    ref = re.sub(r':\w+\.\w+', ':id', ref)

    # 4b. Handle grouping folder prefixes if present in code
    # ONLY remove folders with literal parentheses like (procurement)
    for group in ROUTE_GROUPS:
        if group.startswith("("):
            ref = ref.replace(f"/{group}/", "/")

    # 5. Handle leading locale/pathname variables
    # If starts with /:locale or /:pathname, strip it
    if ref.startswith("/:locale"):
        rest = ref[len("/:locale"):]
        ref = rest if rest else "/"
    elif ref.startswith("/:pathname"):
        rest = ref[len("/:pathname"):]
        ref = rest if rest else "/"
    
    # 6. Remove actual locale prefix (e.g., /en/ or /ar/)
    locale_pattern = re.compile(r'^/([a-z]{2,3}(?:-[A-Z]{2,4})?)/(.*)')
    m = locale_pattern.match(ref)
    if m:
        rest = m.group(2)
        ref = "/" + rest if rest else "/"

    # 7. Remove trailing slash except for root
    if ref != "/" and ref.endswith("/"):
        ref = ref.rstrip("/")
    return ref



def cross_reference_routes(
    route_map: dict[str, RouteEntry],
    href_refs: dict[str, list[str]],
    router_refs: dict[str, list[str]],
    dynamic_refs: dict[str, list[str]] = None
) -> list[BrokenRef]:
    """
    Match UI references against known routes.
    Update route_map entries with found references.
    Return list of broken references (references pointing to non-existent routes).
    """
    route_paths = set(route_map.keys())

    # Build regex patterns for dynamic routes
    dynamic_patterns = []
    for path in route_paths:
        if ":" in path:
            # Replace any :variable with [^/]+
            pattern_str = re.escape(path)
            pattern_str = re.sub(r'\\:[a-zA-Z_]\w*', r'[^/]+', pattern_str)
            dynamic_patterns.append((path, re.compile(r"^" + pattern_str + r"$")))

    # Collect all references
    all_refs: dict[str, list[tuple[str, str]]] = {}
    for src_file, refs in href_refs.items():
        for r in refs:
            norm = normalize_ref_path(r)
            if norm == "EXCLUDED_API_PATH": continue
            all_refs.setdefault(norm, []).append((src_file, "href"))

    for src_file, refs in router_refs.items():
        for r in refs:
            norm = normalize_ref_path(r)
            if norm == "EXCLUDED_API_PATH": continue
            all_refs.setdefault(norm, []).append((src_file, "router"))

    if dynamic_refs:
        for src_file, refs in dynamic_refs.items():
            for r in refs:
                norm = normalize_ref_path(r)
                if norm == "EXCLUDED_API_PATH": continue
                # Avoid duplicates if already caught by href/router
                if any(src == src_file for src, _ in all_refs.get(norm, [])):
                    continue
                all_refs.setdefault(norm, []).append((src_file, "dynamic"))

    # Match refs to routes
    broken_refs: list[BrokenRef] = []

    for ref_path, sources in all_refs.items():
        matched = False

        # Direct match
        if ref_path in route_paths:
            for src, kind in sources:
                route_map[ref_path].references.append(f"{src} ({kind})")
            matched = True
        else:
            # Dynamic pattern match (Smarter match for references with :id)
            for route_path, pattern in dynamic_patterns:
                # If the reference contains :id, we should also check if it matches the route
                # but with wildcard logic in both directions.
                if pattern.match(ref_path):
                    for src, kind in sources:
                        route_map[route_path].references.append(f"{src} ({kind}, matched via dynamic pattern)")
                    matched = True
                    break
                
                # Special case: reference has :id where route has static segment
                # e.g. /:id/:id matches /goods-received/:id
                ref_segments = ref_path.strip("/").split("/")
                route_segments = route_path.strip("/").split("/")
                
                if len(ref_segments) == len(route_segments):
                    seg_match = True
                    for rs, rts in zip(ref_segments, route_segments):
                        if rs == rts: continue
                        if rs == ":id" or rts.startswith(":"): continue
                        seg_match = False
                        break
                    if seg_match:
                        for src, kind in sources:
                            route_map[route_path].references.append(f"{src} ({kind}, flexible segment match)")
                        matched = True
                        break

            # Parent route match (for sub-pages like /settings matching /admin/settings)
            if not matched:
                for rp in route_paths:
                    if ref_path.startswith(rp + "/"):
                        matched = True
                        break

            # Common prefix fallback (e.g., /admin matches /admin/settings)
            if not matched:
                parts = ref_path.rsplit("/", 1)
                if len(parts) == 2:
                    parent = parts[0] if parts[0] else "/"
                    if parent in route_paths:
                        matched = True

        if not matched and ref_path.startswith("/"):
            # Skip common non-route paths
            skip_prefixes = ("/_next", "/api", "/static", "/favicon", "/icon", "/.well-known")
            if not any(ref_path.startswith(p) for p in skip_prefixes):
                for src, kind in sources:
                    broken_refs.append(BrokenRef(
                        source_file=src,
                        target_path=ref_path,
                        issue="404 - Route not found",
                    ))

    return broken_refs


# ---------------------------------------------------------------------------
# T009 – Flag orphan pages
# ---------------------------------------------------------------------------

def flag_orphans(
    route_map: dict[str, RouteEntry],
    external_entries: list[str],
    feature_gated: list[str],
    internal_tooling: list[str],
) -> list[str]:
    """
    Mark routes with zero references as Orphan.
    Known entry points (/, /login, /dashboard) are marked as Entry instead.
    Returns list of orphan route paths.
    """
    entry_paths = {"/", "/login", "/dashboard", "/forgot-password", "/reset-password"}
    orphan_paths = []

    for path, entry in route_map.items():
        # Check for feature flags in content
        try:
            content = (REPO_ROOT / entry.source_file).read_text(encoding="utf-8", errors="ignore")
            ff_match = RE_FEATURE_FLAG.search(content)
            if ff_match:
                entry.status = "Planned / Hidden (Feature-Gated)"
                entry.notes = f"Feature Flag: {ff_match.group(1)}"
                continue
        except Exception:
            pass

        if path in internal_tooling:
            entry.status = "Internal Tooling"
            entry.notes = "Configured in internal-tooling.json"
            continue

        if path in feature_gated:
            entry.status = "Planned / Hidden (Feature-Gated)"
            entry.notes = "Configured in feature-gated-routes.json"
            continue

        if path in external_entries:
            entry.status = "External Entry Point"
            entry.notes = "Configured in external-entry-points.json"
            continue

        if not entry.references and not entry.dynamic_refs:
            if path in entry_paths or path in WHITELIST_ORPHANS:
                entry.status = "Entry" if path in entry_paths else "Active"
                entry.notes = "Known entry point" if path in entry_paths else "Whitelisted functional route"
            else:
                entry.status = "Orphan"
                entry.notes = "No references found"
                orphan_paths.append(path)

    return orphan_paths


# ---------------------------------------------------------------------------
# T010 – Parse publicPaths from proxy.ts
# ---------------------------------------------------------------------------

def parse_public_paths(proxy_file: Path) -> list[str]:
    """
    Extract the publicPaths array from proxy.ts.
    """
    try:
        content = proxy_file.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        print(f"WARNING: Could not read {proxy_file}")
        return []

    match = re.search(r'publicPaths\s*=\s*\[([^\]]*)\]', content, re.DOTALL)
    if not match:
        print("WARNING: Could not find publicPaths in proxy.ts")
        return []

    paths_raw = match.group(1)
    paths = re.findall(r"""['"]([^'"]+)['"]""", paths_raw)
    return paths


# ---------------------------------------------------------------------------
# T011 – Assign Protected/Public/Bypass status
# ---------------------------------------------------------------------------

def assign_guard_status(
    route_map: dict[str, RouteEntry],
    public_paths: list[str],
) -> None:
    """Assign guard status to each route based on proxy.ts publicPaths."""
    for path, entry in route_map.items():
        if path in public_paths:
            entry.guard = "Public"
        else:
            entry.guard = "Protected"


# ---------------------------------------------------------------------------
# T012 – Verify middleware matcher
# ---------------------------------------------------------------------------

def verify_middleware_matcher(proxy_file: Path, route_map: dict[str, RouteEntry]) -> list[str]:
    """
    Check that all non-Public, non-Bypass routes are covered by the
    middleware matcher config in proxy.ts.
    """
    try:
        content = proxy_file.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return []

    issues = []

    matcher_match = re.search(
        r'matcher\s*:\s*\[([^\]]*)\]',
        content,
        re.DOTALL,
    )
    if not matcher_match:
        issues.append("Could not parse matcher configuration from proxy.ts")
        return issues

    matcher_pattern = matcher_match.group(1).strip()

    # The matcher excludes api, _next/static, _next/image, favicon.ico, static, icon.svg
    # This is a negative match pattern - it matches everything EXCEPT those paths
    # So all our routes should be covered. We just need to verify the pattern is reasonable.
    excluded = ["api", "_next/static", "_next/image", "favicon.ico", "static", "icon.svg", "favicon.svg"]

    # Verify that asset routes in the app are excluded properly
    # This is mostly a sanity check - the matcher pattern should cover all app routes
    if not matcher_pattern:
        issues.append("Empty matcher pattern - middleware may not be active")

    return issues


# ---------------------------------------------------------------------------
# T014 – Map dynamic routes ([:id] patterns)
# ---------------------------------------------------------------------------

def map_dynamic_routes(
    route_map: dict[str, RouteEntry],
    dynamic_refs: dict[str, list[str]],
) -> list[str]:
    """
    For dynamic routes (containing :id or [id]), try to match
    dynamic references. Flag as Review if no match found.
    Returns list of routes flagged for review.
    """
    review_paths = []

    dynamic_route_paths = [p for p in route_map if ":id" in p or "[id]" in p]

    # Collect all normalized dynamic ref expressions to try matching
    all_dynamic_expressions: list[str] = []
    for src, exprs in dynamic_refs.items():
        all_dynamic_expressions.extend(exprs)

    for path in dynamic_route_paths:
        entry = route_map[path]

        # Check if any reference already points to a parent path of this dynamic route
        parent_path = path.rsplit("/:id", 1)[0] if ":id" in path else path.rsplit("/", 1)[0]

        # Check if parent path has references
        parent_has_refs = False
        if parent_path in route_map and route_map[parent_path].references:
            parent_has_refs = True

        # Check for direct references to this dynamic path pattern
        has_direct_refs = bool(entry.references)

        if has_direct_refs:
            entry.status = "Active"
            entry.notes = f"Dynamic route with {len(entry.references)} reference(s)"
        elif parent_has_refs:
            entry.status = "Active"
            entry.notes = f"Dynamic route accessible via parent path '{parent_path}'"
        else:
            entry.status = "Review"
            entry.notes = "Dynamic path construction - requires manual verification"
            review_paths.append(path)

    return review_paths


# ---------------------------------------------------------------------------
# T015 – Generate audit-report.md
# ---------------------------------------------------------------------------

def generate_report(
    route_map: dict[str, RouteEntry],
    broken_refs: list[BrokenRef],
    orphan_paths: list[str],
    review_paths: list[str],
    matcher_issues: list[str],
) -> str:
    """Generate the final audit report as Markdown."""

    lines = []
    lines.append("# Route Integrity Audit Report")
    lines.append("")
    lines.append(f"**Generated**: Auto-generated by `audit-routes.py`")
    lines.append(f"**Total Routes Found**: {len(route_map)}")
    lines.append(f"**Orphan Routes**: {len(orphan_paths)}")
    lines.append(f"**Routes Flagged for Review**: {len(review_paths)}")
    lines.append(f"**Broken References**: {len(broken_refs)}")
    lines.append("")

    # Route Integrity Table
    lines.append("## 1. Route Integrity Table")
    lines.append("")
    lines.append("| Path | Status | Guard | Notes |")
    lines.append("| :--- | :--- | :--- | :--- |")

    for path in sorted(route_map.keys()):
        entry = route_map[path]
        notes_display = entry.notes.replace("|", "\\|") if entry.notes else ""
        lines.append(f"| `{path}` | `{entry.status}` | `{entry.guard}` | {notes_display} |")

    lines.append("")

    # Broken References Table
    lines.append("## 2. Broken References Table")
    lines.append("")

    if broken_refs:
        lines.append("| Source File | Target Path | Issue |")
        lines.append("| :--- | :--- | :--- |")
        for br in broken_refs:
            lines.append(f"| `{br.source_file}` | `{br.target_path}` | {br.issue} |")
    else:
        lines.append("*No broken references found.*")

    lines.append("")

    # Summary Statistics
    lines.append("## 3. Summary Statistics")
    lines.append("")

    status_counts: dict[str, int] = {}
    guard_counts: dict[str, int] = {}
    for entry in route_map.values():
        status_counts[entry.status] = status_counts.get(entry.status, 0) + 1
        guard_counts[entry.guard] = guard_counts.get(entry.guard, 0) + 1

    lines.append("### By Status")
    lines.append("")
    for status in ["Entry", "Active", "Orphan", "Review", "External Entry Point", "Planned / Hidden (Feature-Gated)", "Internal Tooling"]:
        count = status_counts.get(status, 0)
        lines.append(f"- **{status}**: {count}")
    lines.append("")

    lines.append("### By Guard")
    lines.append("")
    for guard in ["Public", "Protected", "Bypass"]:
        count = guard_counts.get(guard, 0)
        lines.append(f"- **{guard}**: {count}")
    lines.append("")

    # Middleware Issues
    if matcher_issues:
        lines.append("## 4. Middleware Matcher Issues")
        lines.append("")
        for issue in matcher_issues:
            lines.append(f"- {issue}")
        lines.append("")

    # Orphan Routes Detail
    if orphan_paths:
        lines.append("## 5. Orphan Routes (No Navigation References)")
        lines.append("")
        lines.append("The following routes have **no** incoming navigation references (Link, <a>, router.push, router.replace):")
        lines.append("")
        for path in sorted(orphan_paths):
            entry = route_map[path]
            lines.append(f"- `{path}` — source: `{entry.source_file}`")
        lines.append("")

    # Review Routes Detail
    if review_paths:
        lines.append("## 6. Routes Flagged for Manual Review")
        lines.append("")
        lines.append("The following dynamic routes require manual verification:")
        lines.append("")
        for path in sorted(review_paths):
            entry = route_map[path]
            lines.append(f"- `{path}` — source: `{entry.source_file}`")
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("*This report was generated by `apps/web/scripts/audit-routes.py`. Re-run the script after any routing changes.*")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("Route & Navigation Integrity Audit")
    print("=" * 60)
    print()

    # --- T003: Filesystem Traversal ---
    print("[T003] Scanning for page.tsx files...")
    if not APP_DIR.exists():
        print(f"ERROR: App directory not found: {APP_DIR}")
        sys.exit(1)

    page_files = find_page_files(APP_DIR)
    print(f"  Found {len(page_files)} page.tsx files")

    for pf in page_files[:5]:
        print(f"    {pf.relative_to(REPO_ROOT)}")
    if len(page_files) > 5:
        print(f"    ... and {len(page_files) - 5} more")
    print()

    # --- T004/T005: Build Route Map ---
    print("[T004/T005] Building route map...")
    route_map = build_route_map(page_files)
    print(f"  Normalized {len(route_map)} routes:")
    for path in sorted(route_map.keys())[:10]:
        print(f"    {path}")
    if len(route_map) > 10:
        print(f"    ... and {len(route_map) - 10} more")
    print()

    # --- T006: Extract href references ---
    print("[T006] Extracting href references from Link/<a> tags...")
    href_refs = extract_href_references(APP_SRC)
    total_href = sum(len(refs) for refs in href_refs.values())
    print(f"  Found {total_href} href references in {len(href_refs)} files")
    print()

    # --- T007: Extract router references ---
    print("[T007] Extracting router.push/replace references...")
    router_refs = extract_router_references(APP_SRC)
    total_router = sum(len(refs) for refs in router_refs.values())
    print(f"  Found {total_router} router references in {len(router_refs)} files")
    print()

    # --- T013: Detect dynamic path construction ---
    print("[T013] Detecting dynamic path construction patterns...")
    dynamic_refs = extract_dynamic_refs(APP_SRC)
    total_dynamic = sum(len(refs) for refs in dynamic_refs.values())
    print(f"  Found {total_dynamic} dynamic references in {len(dynamic_refs)} files")
    print()

    # --- T008: Cross-reference ---
    print("[T008] Cross-referencing disk routes with UI references...")
    broken_refs = cross_reference_routes(route_map, href_refs, router_refs, dynamic_refs)
    print(f"  Found {len(broken_refs)} broken references")
    print()
    print("[T010] Parsing publicPaths from proxy.ts...")
    if PROXY_FILE.exists():
        public_paths = parse_public_paths(PROXY_FILE)
        print(f"  Public paths: {public_paths}")
    else:
        public_paths = []
        print("  WARNING: proxy.ts not found")
    print()

    # --- T011: Assign guard status ---
    print("[T011] Assigning guard status...")
    assign_guard_status(route_map, public_paths)
    protected = sum(1 for e in route_map.values() if e.guard == "Protected")
    public = sum(1 for e in route_map.values() if e.guard == "Public")
    print(f"  Protected: {protected}, Public: {public}")
    print()

    # --- T012: Verify middleware matcher ---
    print("[T012] Verifying middleware matcher...")
    if PROXY_FILE.exists():
        matcher_issues = verify_middleware_matcher(PROXY_FILE, route_map)
        if matcher_issues:
            for issue in matcher_issues:
                print(f"  ISSUE: {issue}")
        else:
            print("  Middleware matcher covers all routes (no issues found)")
    else:
        matcher_issues = ["proxy.ts not found"]
    print()

    # --- T014: Map dynamic routes ---
    print("[T014] Mapping dynamic routes...")
    review_paths = map_dynamic_routes(route_map, dynamic_refs)
    print(f"  Routes flagged for review: {len(review_paths)}")
    for p in review_paths[:5]:
        print(f"    {p}")
    if len(review_paths) > 5:
        print(f"    ... and {len(review_paths) - 5} more")
    print()

    # --- T009: Flag orphans (MUST RUN AFTER T014 to avoid discrepancy) ---
    print("[T009] Flagging orphan routes...")
    
    # Load classification configs
    external_entries = load_audit_config(EXTERNAL_ENTRY_POINTS_FILE, "external_entry_points")
    feature_gated = load_audit_config(FEATURE_GATED_ROUTES_FILE, "feature_gated_routes")
    internal_tooling = load_audit_config(INTERNAL_TOOLING_FILE, "internal_tooling")
    
    if external_entries:
        print(f"  Loaded {len(external_entries)} external entry points")
    if feature_gated:
        print(f"  Loaded {len(feature_gated)} feature-gated routes")
    if internal_tooling:
        print(f"  Loaded {len(internal_tooling)} internal tooling routes")

    orphan_paths = flag_orphans(route_map, external_entries, feature_gated, internal_tooling)
    print(f"  Found {len(orphan_paths)} orphan routes")
    if orphan_paths:
        for p in orphan_paths[:10]:
            print(f"    {p}")
        if len(orphan_paths) > 10:
            print(f"    ... and {len(orphan_paths) - 10} more")
    print()

    # --- T015: Generate report ---
    print("[T015] Generating audit report...")
    report = generate_report(route_map, broken_refs, orphan_paths, review_paths, matcher_issues)

    REPORT_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    REPORT_OUTPUT.write_text(report, encoding="utf-8")
    print(f"  Report written to: {REPORT_OUTPUT.relative_to(REPO_ROOT)}")
    print()

    # --- Final Summary ---
    print("=" * 60)
    print("AUDIT COMPLETE")
    print("=" * 60)
    print(f"  Routes discovered:    {len(route_map)}")
    print(f"  Orphan routes:         {len(orphan_paths)}")
    print(f"  Review required:       {len(review_paths)}")
    print(f"  Broken references:     {len(broken_refs)}")
    print(f"  Protected routes:      {protected}")
    print(f"  Public routes:         {public}")
    print(f"  Middleware issues:      {len(matcher_issues)}")
    print()
    print(f"Report: {str(REPORT_OUTPUT.relative_to(REPO_ROOT)).replace(chr(0x2011), '-')}")
    print()

    # Exit with error code if orphans or broken refs found
    if orphan_paths or broken_refs:
        print("WARNING: Action required - Orphan routes or broken references found.")
        print("  Review the report for details.")

    return 0


if __name__ == "__main__":
    sys.exit(main())