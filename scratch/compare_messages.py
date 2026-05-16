import json

def get_keys(d, prefix=''):
    keys = set()
    for k, v in d.items():
        full_key = f"{prefix}{k}"
        keys.add(full_key)
        if isinstance(v, dict):
            keys.update(get_keys(v, f"{full_key}."))
    return keys

with open('apps/web/messages/en.json', 'r', encoding='utf-8') as f:
    en = json.load(f)
with open('apps/web/messages/ar.json', 'r', encoding='utf-8') as f:
    ar = json.load(f)

en_keys = get_keys(en)
ar_keys = get_keys(ar)

missing_in_ar = en_keys - ar_keys
missing_in_en = ar_keys - en_keys

print(f"Missing in ar.json ({len(missing_in_ar)}):")
for k in sorted(missing_in_ar):
    print(f"  {k}")

print(f"\nMissing in en.json ({len(missing_in_en)}):")
for k in sorted(missing_in_en):
    print(f"  {k}")
