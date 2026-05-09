import re

RE_ROUTER_PUSH_TEMPLATE = re.compile(r'''(?:router|useRouter)\s*(?:\.|\.\s*)push\s*\(\s*[`"']([^"`']*?\$\{[^}]+?\}[^"`']*?)[`"']''', re.IGNORECASE)

content = """
onClick={() => router.push(`/purchase-requests/${initialData?.id}/edit`)}
"""

matches = list(RE_ROUTER_PUSH_TEMPLATE.finditer(content))
print(f"Found {len(matches)} matches")
for m in matches:
    print(f"Match: {m.group(1)}")

def normalize_ref_path(ref: str) -> str:
    # 3. Convert remaining template literals
    # Use :id for anything that looks like a parameter
    ref = re.sub(r'\$\{([^}]+)\}', r':id', ref)
    return ref

if matches:
    print(f"Normalized: {normalize_ref_path(matches[0].group(1))}")
