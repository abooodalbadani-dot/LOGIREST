import json
import os

def list_root_structure(filename):
    if not os.path.exists(filename):
        print(f"{filename} not found")
        return
    
    with open(filename, 'r', encoding='utf-8') as f:
        # We can't use json.load because it will merge duplicates
        # We'll do a simple line-by-line check for root keys
        level = 0
        for i, line in enumerate(f):
            stripped = line.strip()
            if stripped == '{':
                level += 1
                continue
            if stripped == '}':
                level -= 1
                continue
            if level == 1 and stripped.startswith('"') and stripped.endswith('{'):
                print(f"Line {i+1}: {stripped}")

print("EN Structure:")
list_root_structure('apps/web/messages/en.json')
print("\nAR Structure:")
list_root_structure('apps/web/messages/ar.json')
