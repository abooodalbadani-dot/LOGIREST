import json
from collections import Counter

def get_keys(obj, prefix=''):
    keys = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            keys.append(f"{prefix}{k}")
            keys.extend(get_keys(v, f"{prefix}{k}."))
    return keys

try:
    with open('messages/ar.json', 'r', encoding='utf-8') as f:
        d = json.load(f)
    all_keys = get_keys(d)
    counts = Counter(all_keys)
    dups = [k for k, v in counts.items() if v > 1]
    if dups:
        print(f"Duplicates found: {dups}")
    else:
        print("No duplicates found.")
except Exception as e:
    print(f"Error: {e}")
