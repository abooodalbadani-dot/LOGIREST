import json

def get_duplicates(obj, path=""):
    duplicates = []
    if isinstance(obj, dict):
        keys = list(obj.keys())
        seen = set()
        for k in keys:
            if k in seen:
                duplicates.append(f"{path}.{k}" if path else k)
            seen.add(k)
            duplicates.extend(get_duplicates(obj[k], f"{path}.{k}" if path else k))
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            duplicates.extend(get_duplicates(item, f"{path}[{i}]"))
    return duplicates

with open('messages/ar.json', 'r', encoding='utf-8') as f:
    content = f.read()

# We need a custom decoder that doesn't overwrite
def custom_decoder(pairs):
    res = {}
    for k, v in pairs:
        if k in res:
            print(f"Duplicate key: {k}")
        res[k] = v
    return res

json.loads(content, object_pairs_hook=custom_decoder)
