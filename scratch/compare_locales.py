import json

def get_keys(d, prefix=''):
    keys = set()
    for k, v in d.items():
        full_key = f"{prefix}.{k}" if prefix else k
        keys.add(full_key)
        if isinstance(v, dict):
            keys.update(get_keys(v, full_key))
    return keys

with open('apps/web/messages/en.json', 'r', encoding='utf-8') as f:
    en = json.load(f)

with open('apps/web/messages/ar.json', 'r', encoding='utf-8') as f:
    ar = json.load(f)

en_keys = get_keys(en)
ar_keys = get_keys(ar)

only_en = sorted(list(en_keys - ar_keys))
only_ar = sorted(list(ar_keys - en_keys))

print(f"Keys only in EN: {len(only_en)}")
for k in only_en[:20]: # Show first 20
    print(f"  - {k}")
if len(only_en) > 20: print("  ...")

print(f"\nKeys only in AR: {len(only_ar)}")
for k in only_ar[:20]: # Show first 20
    print(f"  - {k}")
if len(only_ar) > 20: print("  ...")
