
import json

def get_keys(data, prefix=""):
    keys = []
    if isinstance(data, dict):
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            keys.append(full_key)
            keys.extend(get_keys(v, full_key))
    return keys

def load_json_carefully(path):
    with open(path, 'r', encoding='utf-8') as f:
        # Since the file might be large or have issues, let's try to parse it
        try:
            return json.load(f)
        except json.JSONDecodeError as e:
            print(f"Error parsing {path}: {e}")
            return None

en_data = load_json_carefully("apps/web/messages/en.json")
ar_data = load_json_carefully("apps/web/messages/ar.json")

if en_data and ar_data:
    en_kitchen = en_data.get("operations", {}).get("kitchen_request", {})
    ar_kitchen = ar_data.get("operations", {}).get("kitchen_request", {})
    
    en_keys = set(get_keys(en_kitchen))
    ar_keys = set(get_keys(ar_kitchen))
    
    print("Keys in EN but not in AR:")
    for k in sorted(en_keys - ar_keys):
        print(f"  {k}")
        
    print("\nKeys in AR but not in EN:")
    for k in sorted(ar_keys - en_keys):
        print(f"  {k}")
