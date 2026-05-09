import re

def normalize_ref_path(ref: str) -> str:
    print(f"Input: {ref}")
    ref = ref.strip()
    ref = ref.split("#")[0].split("?")[0]
    print(f"After split: {ref}")
    
    # Step 3
    ref = re.sub(r'\$\{([^}]+)\}', r':id', ref)
    print(f"After Step 3: {ref}")
    
    # Step 4
    ref = re.sub(r':\w+\.\w+', ':id', ref)
    print(f"After Step 4: {ref}")

    return ref

normalize_ref_path('/purchase-requests/${initialData?.id}/edit')
normalize_ref_path('/purchase-requests/${initialData?.id}/approve')
