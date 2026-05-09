import json

def get_structure(node, path=""):
    structure = {}
    if isinstance(node, dict):
        for k, v in node.items():
            new_path = f"{path}.{k}" if path else k
            structure[k] = get_structure(v, new_path)
    return structure

with open('apps/web/messages/en.json', 'r', encoding='utf-8') as f:
    en_data = json.load(f)
with open('apps/web/messages/ar.json', 'r', encoding='utf-8') as f:
    ar_data = json.load(f)

en_keys = set(en_data.keys())
ar_keys = set(ar_data.keys())

print(f"Keys only in EN: {en_keys - ar_keys}")
print(f"Keys only in AR: {ar_keys - en_keys}")

for k in en_keys & ar_keys:
    en_sub = set(en_data[k].keys()) if isinstance(en_data[k], dict) else set()
    ar_sub = set(ar_data[k].keys()) if isinstance(ar_data[k], dict) else set()
    if en_sub != ar_sub:
        print(f"Mismatch in children of '{k}':")
        print(f"  Only in EN: {en_sub - ar_sub}")
        print(f"  Only in AR: {ar_sub - en_sub}")
