import json

def get_all_keys(data, prefix=""):
    keys = set()
    if isinstance(data, dict):
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            keys.add(full_key)
            keys.update(get_all_keys(v, full_key))
    return keys

def compare_json_recursive(file1, file2):
    with open(file1, 'r', encoding='utf-8') as f1, open(file2, 'r', encoding='utf-8') as f2:
        data1 = json.load(f1)
        data2 = json.load(f2)
    
    keys1 = get_all_keys(data1)
    keys2 = get_all_keys(data2)
    
    missing_in_2 = sorted(list(keys1 - keys2))
    missing_in_1 = sorted(list(keys2 - keys1))
    
    return missing_in_2, missing_in_1

en_path = 'apps/web/messages/en.json'
ar_path = 'apps/web/messages/ar.json'

missing_in_ar, missing_in_en = compare_json_recursive(en_path, ar_path)

print(f"Keys missing in AR ({len(missing_in_ar)}):")
for k in missing_in_ar[:20]: # Print first 20
    print(f"  - {k}")
if len(missing_in_ar) > 20:
    print(f"  ... and {len(missing_in_ar) - 20} more")

print(f"\nKeys missing in EN ({len(missing_in_en)}):")
for k in missing_in_en[:20]: # Print first 20
    print(f"  - {k}")
if len(missing_in_en) > 20:
    print(f"  ... and {len(missing_in_en) - 20} more")
