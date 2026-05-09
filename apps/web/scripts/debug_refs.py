import re
from pathlib import Path
import sys

# Set stdout to utf-8 to handle special characters in paths
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

RE_ROUTER_PUSH_TEMPLATE = re.compile(r'''(?:router|useRouter)\s*(?:\.|\.\s*)push\s*\(\s*[`"']([^"`']*?\$\{[^}]+?\}[^"`']*?)[`"']''', re.IGNORECASE)

def _extract_router_refs_from_file(filepath: Path, results: dict):
    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return

    refs = []
    for m in RE_ROUTER_PUSH_TEMPLATE.finditer(content):
        refs.append(m.group(1))

    if refs:
        results[str(filepath)] = refs

filepath = Path(r'e:\Kitchen‑Store Inventory System\apps\web\src\features\purchasing\components\purchase-request-form.tsx')
results = {}
_extract_router_refs_from_file(filepath, results)

print(f"Refs found: {results.get(str(filepath), [])}")
