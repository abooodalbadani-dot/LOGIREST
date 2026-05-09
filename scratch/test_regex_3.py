import re
from pathlib import Path

RE_ROUTER_PUSH_TEMPLATE = re.compile(r'''(?:router|useRouter)\s*(?:\.|\.\s*)push\s*\(\s*[`"']([^"`']*?\$\{[^}]+?\}[^"`']*?)[`"']''', re.IGNORECASE)

content = """
                onClick={() => router.push(`/purchase-requests/${initialData?.id}/edit`)}
                onClick={() => router.push(`/purchase-requests/${initialData?.id}/approve`)}
"""

for m in RE_ROUTER_PUSH_TEMPLATE.finditer(content):
    print(f"Match: {m.group(1)}")
