import json
import os

ar_path = r'e:\Kitchen‑Store Inventory System\apps\web\messages\ar.json'
en_path = r'e:\Kitchen‑Store Inventory System\apps\web\messages\en.json'

def get_keys_with_value(data, target_value, prefix=''):
    keys = []
    if isinstance(data, dict):
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            keys.extend(get_keys_with_value(v, target_value, full_key))
    elif isinstance(data, list):
        for i, v in enumerate(data):
            full_key = f"{prefix}[{i}]"
            keys.extend(get_keys_with_value(v, target_value, full_key))
    else:
        if data == target_value:
            keys.append(prefix)
    return keys

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

ar_data = load_json(ar_path)
en_data = load_json(en_path)

target = "طلبات المطبخ"
keys = get_keys_with_value(ar_data, target)

print(f"Found {len(keys)} keys with value '{target}':")
for key in keys:
    # Try to find the English value for context
    parts = key.split('.')
    en_val = en_data
    try:
        for p in parts:
            en_val = en_val[p]
        print(f"{key}: {en_val}")
    except:
        print(f"{key}: (English value not found)")
