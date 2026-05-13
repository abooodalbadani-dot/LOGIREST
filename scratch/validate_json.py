import json
import sys

try:
    with open('apps/web/messages/ar.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    print("ar.json is valid JSON")
    
    # Check for specific keys
    keys_to_check = [
        ["common", "statuses", "draft"],
        ["common", "warehouses", "main"],
        ["operations", "issue", "warehouse_locked"]
    ]
    
    for key_path in keys_to_check:
        curr = data
        found = True
        for part in key_path:
            if isinstance(curr, dict) and part in curr:
                curr = curr[part]
            else:
                found = False
                break
        if found:
            print(f"Found key: {'.'.join(key_path)}")
        else:
            print(f"MISSING key: {'.'.join(key_path)}")

except Exception as e:
    print(f"Error: {e}")
