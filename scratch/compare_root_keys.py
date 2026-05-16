
import json

def get_root_keys(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return list(data.keys())

en_keys = get_root_keys("apps/web/messages/en.json")
ar_keys = get_root_keys("apps/web/messages/ar.json")

print(f"EN Root Keys Count: {len(en_keys)}")
print(f"AR Root Keys Count: {len(ar_keys)}")

print("\nKeys in EN but not in AR:")
for k in set(en_keys) - set(ar_keys):
    print(f"  {k}")

print("\nKeys in AR but not in EN:")
for k in set(ar_keys) - set(en_keys):
    print(f"  {k}")

print("\nOrder Mismatch (First 10 differences):")
min_len = min(len(en_keys), len(ar_keys))
diffs = 0
for i in range(min_len):
    if en_keys[i] != ar_keys[i]:
        print(f"Index {i}: EN={en_keys[i]}, AR={ar_keys[i]}")
        diffs += 1
        if diffs >= 10:
            break
