import json

ar_path = r'e:\kitchen-store-inventory-system\apps\web\messages\ar.json'
en_path = r'e:\kitchen-store-inventory-system\apps\web\messages\en.json'

def get_all_leaf_nodes(data, prefix=''):
    leaves = {}
    if isinstance(data, dict):
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            leaves.update(get_all_leaf_nodes(v, full_key))
    else:
        leaves[prefix] = data
    return leaves

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

ar_data = load_json(ar_path)
en_data = load_json(en_path)

ar_leaves = get_all_leaf_nodes(ar_data)
en_leaves = get_all_leaf_nodes(en_data)

untranslated = []
for key, ar_val in ar_leaves.items():
    if key in en_leaves:
        en_val = en_leaves[key]
        if ar_val == en_val and ar_val and not ar_val.isnumeric():
            untranslated.append((key, ar_val))

print(f"Total untranslated keys (AR == EN): {len(untranslated)}")
for key, val in untranslated:
    print(f"{key}: {val}")
