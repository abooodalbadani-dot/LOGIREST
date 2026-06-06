import re
from pathlib import Path

REPO_ROOT = Path(r"e:\kitchen-store-inventory-system")
FORM_FILE = REPO_ROOT / "apps" / "web" / "src" / "features" / "purchasing" / "components" / "purchase-request-form.tsx"

RE_ROUTER_PUSH_TEMPLATE = re.compile(r'''(?:router|useRouter)\s*(?:\.|\.\s*)push\s*\(\s*[`"']([^"`']*?\$\{[^}]+?\}[^"`']*?)[`"']''', re.IGNORECASE)

def normalize_ref_path(ref: str) -> str:
    ref = ref.split("#")[0].split("?")[0]
    ref = re.sub(r'\$\{([^}]+)\}', r':id', ref)
    return ref

content = FORM_FILE.read_text(encoding="utf-8")
print(f"File size: {len(content)}")

matches = list(RE_ROUTER_PUSH_TEMPLATE.finditer(content))
print(f"Found {len(matches)} matches")
for m in matches:
    raw = m.group(1)
    norm = normalize_ref_path(raw)
    print(f"Raw: {raw} -> Normalized: {norm}")
