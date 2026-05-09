import re

def normalize_ref_path(ref: str) -> str:
    # 0. Strip leading/trailing whitespace
    ref = ref.strip()

    # Remove hash and query parameters
    ref = ref.split("#")[0].split("?")[0]
    if not ref.startswith("/"):
        return ref

    # 2. Handle common specific template variables
    ref = re.sub(r'\$\{(locale|lang|language|localeActive)\}', r':locale', ref)
    ref = re.sub(r'\$\{pathname\}', r':pathname', ref)
    
    # 3. Convert remaining template literals
    ref = re.sub(r'\$\{([^}]+)\}', r':id', ref)
    
    # 4. Normalize common dynamic patterns: :variable.property -> :id
    ref = re.sub(r':\w+\.\w+', ':id', ref)

    return ref

print(f"Edit: {normalize_ref_path('/purchase-requests/${initialData?.id}/edit')}")
print(f"Approve: {normalize_ref_path('/purchase-requests/${initialData?.id}/approve')}")
