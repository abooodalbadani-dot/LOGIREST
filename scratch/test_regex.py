import re

RE_ROUTER_PUSH_TEMPLATE = re.compile(r'''(?:router|useRouter)\s*(?:\.|\.\s*)push\s*\(\s*[`"']([^"`']*?\$\{[^}]+?\}[^"`']*?)[`"']''', re.IGNORECASE)

content = """
<Button
  onClick={() => router.push(`/purchase-requests/${initialData?.id}/edit`)}
  variant="outline"
>
"""

matches = list(RE_ROUTER_PUSH_TEMPLATE.finditer(content))
print(f"Found {len(matches)} matches")
for m in matches:
    print(f"Match: {m.group(1)}")
