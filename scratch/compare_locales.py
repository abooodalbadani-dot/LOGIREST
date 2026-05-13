import json

def load_json(path):
    with open(path, 'rb') as f:
        data = f.read()
    # Try multiple encodings
    for enc in ['utf-8', 'windows-1256']:
        try:
            return json.loads(data.decode(enc)), enc
        except:
            continue
    return None, None

def get_keys(d, prefix=""):
    keys = set()
    for k, v in d.items():
        full_key = f"{prefix}.{k}" if prefix else k
        keys.add(full_key)
        if isinstance(v, dict):
            keys.update(get_keys(v, full_key))
    return keys

def compare():
    en_data, en_enc = load_json('apps/web/messages/en.json')
    ar_data, ar_enc = load_json('apps/web/messages/ar.json')
    
    print(f"EN encoding: {en_enc}, Keys: {len(get_keys(en_data))}")
    print(f"AR encoding: {ar_enc}, Keys: {len(get_keys(ar_data))}")
    
    en_keys = get_keys(en_data)
    ar_keys = get_keys(ar_data)
    
    missing_in_ar = en_keys - ar_keys
    print(f"\nMissing in AR ({len(missing_in_ar)} keys):")
    for k in sorted(list(missing_in_ar))[:20]:
        print(f"  {k}")
    if len(missing_in_ar) > 20:
        print("  ...")

    missing_in_en = ar_keys - en_keys
    print(f"\nMissing in EN ({len(missing_in_en)} keys):")
    for k in sorted(list(missing_in_en))[:20]:
        print(f"  {k}")
    if len(missing_in_en) > 20:
        print("  ...")

    # Check for target keys
    target_keys = [
        "common.statuses.draft",
        "common.warehouses.main",
        "operations.issue.warehouse_locked"
    ]
    print("\nTarget Key Check:")
    for k in target_keys:
        in_en = k in en_keys
        in_ar = k in ar_keys
        print(f"  {k}: EN={in_en}, AR={in_ar}")

if __name__ == "__main__":
    compare()
