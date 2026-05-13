import json

en_path = r'e:\Kitchen‑Store Inventory System\apps\web\messages\en.json'
ar_path = r'e:\Kitchen‑Store Inventory System\apps\web\messages\ar.json'

with open(en_path, 'r', encoding='utf-8') as f:
    en_data = json.load(f)

with open(ar_path, 'r', encoding='utf-8') as f:
    ar_data = json.load(f)

def find_missing_or_empty(en, ar, path=""):
    missing = []
    empty = []
    
    for key, value in en.items():
        current_path = f"{path}.{key}" if path else key
        
        if key not in ar:
            missing.append(current_path)
        elif isinstance(value, dict):
            if not isinstance(ar[key], dict):
                missing.append(f"{current_path} (Expected dict in AR)")
            else:
                m, e = find_missing_or_empty(value, ar[key], current_path)
                missing.extend(m)
                empty.extend(e)
        else:
            if ar[key] == "":
                empty.append(current_path)
                
    return missing, empty

missing, empty = find_missing_or_empty(en_data, ar_data)

print(f"Total Missing Keys: {len(missing)}")
for m in missing:
    print(f"MISSING: {m}")

print(f"\nTotal Empty Strings: {len(empty)}")
for e in empty:
    print(f"EMPTY: {e}")
