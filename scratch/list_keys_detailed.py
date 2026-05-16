
import json

def get_root_keys(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return list(data.keys())

en_keys = get_root_keys("apps/web/messages/en.json")
ar_keys = get_root_keys("apps/web/messages/ar.json")

print("EN Keys:")
for i, k in enumerate(en_keys):
    print(f"  {i}: {k}")

print("\nAR Keys:")
for i, k in enumerate(ar_keys):
    print(f"  {i}: {k}")
