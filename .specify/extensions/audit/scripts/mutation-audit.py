#!/usr/bin/env python3
"""
Mutation & Redirect Compliance Audit Script

Detects violations of the project's mutation and routing standards:
1. `.mutate()` calls without `onError` handler
2. `router.push()` calls immediately following `.mutate()` (eager routing)
3. `useMutation` in `handleSubmit` contexts not using `mutateAsync`

Usage:
    python mutation-audit.py [path]

    If path is omitted, defaults to apps/web/src relative to repo root.
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Tuple

def find_tsx_ts_files(root: Path) -> List[Path]:
    return sorted(root.rglob("*.tsx")) + sorted(root.rglob("*.ts"))


def audit_mutate_without_onerror(content: str, filepath: Path) -> List[Tuple[int, str]]:
    """Detect .mutate() calls that lack an onError handler."""
    violations = []
    lines = content.split("\n")
    for i, line in enumerate(lines, 1):
        if re.search(r'\.mutate\(', line):
            # Check if there's an onError in the same or nearby lines (within the same call)
            # Look for onError in the next 10 lines of the same statement
            start = i - 1
            end = min(i + 10, len(lines))
            block = "\n".join(lines[start:end])
            if not re.search(r'onError', block):
                # Check it's not mutateAsync
                if not re.search(r'\.mutateAsync\(', line):
                    violations.append((i, f"`.mutate()` call without `onError` handler: {line.strip()}"))
    return violations


def audit_eager_routing(content: str, filepath: Path) -> List[Tuple[int, str]]:
    """Detect router.push() called right after .mutate() without await/gating."""
    violations = []
    lines = content.split("\n")
    for i, line in enumerate(lines, 1):
        if "router.push" in line or "guardedRouter.push" in line or "router.replace" in line:
            # Check if the preceding lines (within 3 lines) have a .mutate() call
            # that is NOT inside an onSuccess/await block
            start = max(0, i - 4)
            preceding = "\n".join(lines[start:i-1])
            if re.search(r'\.mutate\(', preceding):
                # Check if the .mutate() is NOT inside an onSuccess callback or awaited
                if not re.search(r'onSuccess.*\{', preceding):
                    violations.append((i, f"Potential eager routing after `.mutate()`: {line.strip()}"))
    return violations


def audit_mutateasync_usage(content: str, filepath: Path) -> List[Tuple[int, str]]:
    """Detect handleSubmit handlers using .mutate() instead of .mutateAsync()."""
    violations = []
    # Find handleSubmit contexts
    lines = content.split("\n")
    in_handle_submit = False
    brace_depth = 0

    for i, line in enumerate(lines, 1):
        if re.search(r'handleSubmit|onSubmit', line):
            in_handle_submit = True
            brace_depth = 0

        if in_handle_submit:
            brace_depth += line.count("{") - line.count("}")
            if ".mutate(" in line and ".mutateAsync(" not in line:
                # Exclude onSuccess callbacks (still valid pattern if combined with error handling)
                if "onSuccess" not in line:
                    violations.append((i, f"`handleSubmit` uses `.mutate()` instead of `await mutateAsync()`: {line.strip()}"))
            if brace_depth <= 0 and "{" in line:
                in_handle_submit = False
    return violations


def audit_version_in_schemas(content: str, filepath: Path) -> List[Tuple[int, str]]:
    """Check if form schemas include version field for update-capable entities."""
    violations = []
    # Only check form schemas for entities that have update functionality
    update_schemas = [
        "BranchFormSchema", "WarehouseFormSchema", "DepartmentFormSchema",
        "UoMFormSchema", "CategoryFormSchema", "SupplierFormSchema",
        "CurrencyFormSchema", "FXRateFormSchema", "BarcodeFormSchema",
    ]

    for schema in update_schemas:
        pattern = rf'{schema}\s*=\s*z\.object\('
        match = re.search(pattern, content)
        if match:
            # Find the extent of this schema definition
            start = match.start()
            # Find closing of the z.object
            depth = 0
            end = start
            for j in range(start, len(content)):
                if content[j] == '(':
                    depth += 1
                elif content[j] == ')':
                    depth -= 1
                    if depth == 0:
                        end = j + 1
                        break
            schema_block = content[start:end]
            line_num = content[:start].count("\n") + 1
            if "version" not in schema_block:
                violations.append((line_num, f"Form schema `{schema}` is missing `version` field"))
    return violations


def main():
    # Determine scan path
    if len(sys.argv) > 1:
        scan_path = Path(sys.argv[1])
    else:
        # Default: relative to script location, find repo root
        script_dir = Path(__file__).resolve()
        repo_root = script_dir
        while repo_root.parent != repo_root:
            if (repo_root / ".git").exists() or (repo_root / "package.json").exists():
                break
            repo_root = repo_root.parent
        scan_path = repo_root / "apps" / "web" / "src"

    if not scan_path.exists():
        print(f"Error: Path does not exist: {scan_path}")
        sys.exit(1)

    # Handle Windows encoding issues with special characters in paths
    if sys.platform == "win32":
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    print(f"Mutation & Redirect Compliance Audit")
    print(f"{'=' * 60}")
    print(f"Scanning: {scan_path}")
    print()

    files = find_tsx_ts_files(scan_path)
    all_violations = {
        "mutate_without_onerror": [],
        "eager_routing": [],
        "mutateasync_usage": [],
        "version_missing": [],
    }

    for filepath in files:
        try:
            content = filepath.read_text(encoding="utf-8")
        except Exception:
            continue

        rel = filepath.relative_to(scan_path) if filepath.is_relative_to(scan_path) else filepath

        all_violations["mutate_without_onerror"].extend(
            (rel, line, msg) for line, msg in audit_mutate_without_onerror(content, filepath)
        )
        all_violations["eager_routing"].extend(
            (rel, line, msg) for line, msg in audit_eager_routing(content, filepath)
        )
        all_violations["mutateasync_usage"].extend(
            (rel, line, msg) for line, msg in audit_mutateasync_usage(content, filepath)
        )

        # Only check schemas in the types file
        if "master-data" in str(filepath) and "types" in str(filepath):
            all_violations["version_missing"].extend(
                (rel, line, msg) for line, msg in audit_version_in_schemas(content, filepath)
            )

    total = 0
    for category, violations in all_violations.items():
        label = category.replace("_", " ").title()
        if violations:
            print(f"\n--- {label} ({len(violations)}) ---")
            for rel, line, msg in violations:
                print(f"  {rel}:{line}: {msg}")
        else:
            print(f"\n  [PASS] {category.replace('_', ' ').title()}: 0 violations")
        total += len(violations)

    print(f"\n{'=' * 60}")
    if total == 0:
        print("AUDIT PASSED: 0 violations found.")
        sys.exit(0)
    else:
        print(f"AUDIT FAILED: {total} violation(s) found.")
        sys.exit(1)


if __name__ == "__main__":
    main()