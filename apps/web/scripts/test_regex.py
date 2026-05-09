import re

RE_ROUTER_PUSH_TEMPLATE = re.compile(r'''(?:router|useRouter)\s*(?:\.|\.\s*)push\s*\(\s*[`"']([^"`']*?\$\{[^}]+?\}[^"`']*?)[`"']''', re.IGNORECASE)

content = 'onClick={() => router.push(`/purchase-requests/${initialData?.id}/approve`)}'

match = RE_ROUTER_PUSH_TEMPLATE.search(content)
if match:
    print(f"Matched: '{match.group(1)}'")
else:
    print("No match")
