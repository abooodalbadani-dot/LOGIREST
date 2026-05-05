import json

def compare_keys(en_path, ar_path, section):
    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
    with open(ar_path, 'r', encoding='utf-8') as f:
        ar_data = json.load(f)
    
    en_section = en_data.get(section, {})
    ar_section = ar_data.get(section, {})
    
    missing_in_ar = []
    
    def walk(en_node, ar_node, path=""):
        for key, value in en_node.items():
            current_path = f"{path}.{key}" if path else key
            if key not in ar_node:
                missing_in_ar.append(current_path)
            elif isinstance(value, dict) and isinstance(ar_node.get(key), dict):
                walk(value, ar_node[key], current_path)
            elif isinstance(value, dict) or isinstance(ar_node.get(key), dict):
                # Type mismatch, but let's just report it if it's a structural issue
                pass

    walk(en_section, ar_section)
    return missing_in_ar

en_file = 'e:/Kitchen‑Store Inventory System/messages/en.json'
ar_file = 'e:/Kitchen‑Store Inventory System/messages/ar.json'

missing = compare_keys(en_file, ar_file, 'procurement')
print("Missing keys in procurement section of ar.json:")
for m in missing:
    print(m)
