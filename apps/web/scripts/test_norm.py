import re

def normalize_ref_path(ref: str) -> str:
    # 2. Handle common specific template variables
    ref = re.sub(r'\$\{(locale|lang|language|localeActive)\}', r':locale', ref)
    ref = re.sub(r'\$\{pathname\}', r':pathname', ref)
    
    # 3. Convert remaining template literals
    ref = re.sub(r'\$\{([^}]+)\}', r':id', ref)
    
    # 4. Remove hash and query parameters
    ref = ref.split("#")[0].split("?")[0]
    
    return ref

test_paths = [
    "/purchase-requests/${initialData?.id}/approve",
    "/purchase-requests/${initialData.id}/approve",
    "/path?query=${val}",
    "/${locale}/master-data/currencies/${id}"
]

for p in test_paths:
    print(f"'{p}' -> '{normalize_ref_path(p)}'")
