import re

IGNORE_PREFIXES = [
    '/api/',
    '/v1/',
    '/procurement/',
    '/operations/',
    '/notifications/',
    '/currencies/'
]

ROUTE_GROUPS = ("(app)", "(auth)", "(operations)", "(procurement)", "(master-data)")

def normalize_ref_path(ref: str) -> str:
    ref = ref.strip()
    for prefix in IGNORE_PREFIXES:
        if ref.startswith(prefix):
            return "EXCLUDED_API_PATH"

    # 2. Handle common specific template variables
    ref = re.sub(r'\$\{(locale|lang|language|localeActive)\}', r':locale', ref)
    ref = re.sub(r'\$\{pathname\}', r':pathname', ref)
    
    # 3. Convert remaining template literals
    ref = re.sub(r'\$\{([^}]+)\}', r':id', ref)
    
    # 4. Remove hash and query parameters
    ref = ref.split("#")[0].split("?")[0]
    
    # 5. Normalize common dynamic patterns
    ref = re.sub(r':\w+\.\w+', ':id', ref)

    # 4b. Handle grouping folder prefixes
    for group in ROUTE_GROUPS:
        if group.startswith("("):
            ref = ref.replace(f"/{group}/", "/")

    # 5. Handle leading locale/pathname variables
    if ref.startswith("/:locale"):
        rest = ref[len("/:locale"):]
        ref = rest if rest else "/"
    elif ref.startswith("/:pathname"):
        rest = ref[len("/:pathname"):]
        ref = rest if rest else "/"
    
    # 6. Remove actual locale prefix
    locale_pattern = re.compile(r'^/([a-z]{2,3}(?:-[A-Z]{2,4})?)/(.*)')
    m = locale_pattern.match(ref)
    if m:
        rest = m.group(2)
        ref = "/" + rest
    
    return ref

RE_ROUTER_PUSH_TEMPLATE = re.compile(r'''(?:router|useRouter)\s*(?:\.|\.\s*)push\s*\(\s*[`"']([^"`']*?\$\{[^}]+?\}[^"`']*?)[`"']''', re.IGNORECASE)

content = 'onClick={() => router.push(`/purchase-requests/${initialData?.id}/approve`)}'
match = RE_ROUTER_PUSH_TEMPLATE.search(content)
if match:
    raw_ref = match.group(1)
    norm_ref = normalize_ref_path(raw_ref)
    print(f"Raw: {raw_ref}")
    print(f"Normalized: {norm_ref}")
else:
    print("No match")
