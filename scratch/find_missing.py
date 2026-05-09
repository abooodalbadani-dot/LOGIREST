import json

def get_keys(data, prefix=''):
    keys = set()
    for k, v in data.items():
        full_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            keys.update(get_keys(v, full_key))
        else:
            keys.add(full_key)
    return keys

en = json.load(open('apps/web/messages/en.json', 'r', encoding='utf-8'))
ar = json.load(open('apps/web/messages/ar.json', 'r', encoding='utf-8'))

ek = get_keys(en)
ak = get_keys(ar)

print("Missing in AR:")
for k in sorted(list(ek - ak)):
    print(f"  {k}")

print("\nMissing in EN:")
for k in sorted(list(ak - ek)):
    print(f"  {k}")
