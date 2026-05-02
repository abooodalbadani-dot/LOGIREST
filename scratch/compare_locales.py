import json

def get_keys(data, prefix=''):
    keys = set()
    if isinstance(data, dict):
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            keys.add(full_key)
            keys.update(get_keys(v, full_key))
    return keys

with open(r'e:\Kitchen‑Store Inventory System\messages\en.json', 'r', encoding='utf-8') as f:
    en_data = json.load(f)

with open(r'e:\Kitchen‑Store Inventory System\messages\ar.json', 'r', encoding='utf-8') as f:
    ar_data = json.load(f)

en_keys = get_keys(en_data)
ar_keys = get_keys(ar_data)

print("Keys in EN but not in AR:")
for k in sorted(en_keys - ar_keys):
    print(k)

print("\nKeys in AR but not in EN:")
for k in sorted(ar_keys - en_keys):
    print(k)
