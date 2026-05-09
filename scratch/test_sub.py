import re
ref = "/purchase-requests/${initialData?.id}/edit"
norm = re.sub(r'\$\{([^}]+)\}', r':id', ref)
print(f"Norm: {norm}")
