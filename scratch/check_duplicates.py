import json

def check_json(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    content = "".join(lines)
    
    def detect_duplicates(pairs):
        keys = {}
        for k, v in pairs:
            if k in keys:
                print(f"Duplicate key found: '{k}' at approximately line {keys[k]}")
            # This is a bit tricky with nested objects, but let's try to find the line
            # We'll just search for the key in the file
            keys[k] = "unknown" # Placeholder
        return dict(pairs)

    try:
        json.loads(content, object_pairs_hook=detect_duplicates)
    except Exception as e:
        print(f"Error parsing JSON: {e}")

print("Checking en.json:")
check_json(r'e:\Kitchen‑Store Inventory System\messages\en.json')
print("\nChecking ar.json:")
check_json(r'e:\Kitchen‑Store Inventory System\messages\ar.json')
