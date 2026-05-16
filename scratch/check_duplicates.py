import json

def check_duplicates(pairs):
    d = {}
    for k, v in pairs:
        if k in d:
            print(f"Duplicate key found: {k}")
        d[k] = v
    return d

try:
    with open('apps/web/messages/ar.json', 'r', encoding='utf-8') as f:
        json.load(f, object_pairs_hook=check_duplicates)
    print("Check complete")
except Exception as e:
    print(f"Error: {e}")
