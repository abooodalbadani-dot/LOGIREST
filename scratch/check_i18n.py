import json
import os

def compare_keys(en_data, ar_data, path=""):
    missing_in_ar = []
    missing_in_en = []
    
    for key in en_data:
        new_path = f"{path}.{key}" if path else key
        if key not in ar_data:
            missing_in_ar.append(new_path)
        elif isinstance(en_data[key], dict) and isinstance(ar_data[key], dict):
            m_ar, m_en = compare_keys(en_data[key], ar_data[key], new_path)
            missing_in_ar.extend(m_ar)
            missing_in_en.extend(m_en)
            
    for key in ar_data:
        new_path = f"{path}.{key}" if path else key
        if key not in en_data:
            missing_in_en.append(new_path)
            
    return missing_in_ar, missing_in_en

en_path = "e:/Kitchen‑Store Inventory System/apps/web/messages/en.json"
ar_path = "e:/Kitchen‑Store Inventory System/apps/web/messages/ar.json"

with open(en_path, 'r', encoding='utf-8') as f:
    en_data = json.load(f)
with open(ar_path, 'r', encoding='utf-8') as f:
    ar_data = json.load(f)

missing_ar, missing_en = compare_keys(en_data, ar_data)

print(f"Missing in AR ({len(missing_ar)}):")
for k in missing_ar[:20]:
    print(f"  - {k}")
if len(missing_ar) > 20:
    print(f"  ... and {len(missing_ar) - 20} more")

print(f"\nMissing in EN ({len(missing_en)}):")
for k in missing_en[:20]:
    print(f"  - {k}")
if len(missing_en) > 20:
    print(f"  ... and {len(missing_en) - 20} more")
