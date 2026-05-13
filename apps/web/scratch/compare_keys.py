import json

def compare_keys(en_path, ar_path):
    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
    with open(ar_path, 'r', encoding='utf-8') as f:
        ar_data = json.load(f)

    def get_keys(d, prefix=""):
        keys = set()
        for k, v in d.items():
            full_key = f"{prefix}.{k}" if prefix else k
            keys.add(full_key)
            if isinstance(v, dict):
                keys.update(get_keys(v, full_key))
        return keys

    en_keys = get_keys(en_data)
    ar_keys = get_keys(ar_data)

    missing_in_ar = en_keys - ar_keys
    missing_in_en = ar_keys - en_keys

    print(f"Missing in Arabic: {len(missing_in_ar)}")
    for k in sorted(missing_in_ar):
        print(f"  - {k}")
    
    print(f"Missing in English: {len(missing_in_en)}")
    for k in sorted(missing_in_en):
        print(f"  - {k}")

compare_keys('apps/web/messages/en.json', 'apps/web/messages/ar.json')
