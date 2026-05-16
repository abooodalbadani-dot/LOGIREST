
import json
import os

def get_all_keys(data, prefix=""):
    keys = {}
    if isinstance(data, dict):
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                keys.update(get_all_keys(v, full_key))
            else:
                keys[full_key] = v
    return keys

def check_parity():
    en_path = r"e:\Kitchen‑Store Inventory System\apps\web\messages\en.json"
    ar_path = r"e:\Kitchen‑Store Inventory System\apps\web\messages\ar.json"
    
    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
    with open(ar_path, 'r', encoding='utf-8') as f:
        ar_data = json.load(f)
        
    en_keys = get_all_keys(en_data)
    ar_keys = get_all_keys(ar_data)
    
    en_key_set = set(en_keys.keys())
    ar_key_set = set(ar_keys.keys())
    
    missing_in_ar = en_key_set - ar_key_set
    missing_in_en = ar_key_set - en_key_set
    
    print(f"Total EN keys: {len(en_key_set)}")
    print(f"Total AR keys: {len(ar_key_set)}")
    
    if missing_in_ar:
        print(f"\nMissing in AR ({len(missing_in_ar)} keys):")
        for k in sorted(missing_in_ar):
            print(f"  {k}")
            
    if missing_in_en:
        print(f"\nMissing in EN ({len(missing_in_en)} keys):")
        for k in sorted(missing_in_en):
            print(f"  {k}")

    # Check for empty values or untranslated (same as EN)
    untranslated = []
    for k in sorted(en_key_set & ar_key_set):
        if en_keys[k] == ar_keys[k] and en_keys[k].strip() != "" and not k.startswith("common.navigation"): # Ignore nav which might be same
             # Some things might naturally be same (e.g. abbreviations)
             # But if it's a long string it's probably untranslated
             if len(en_keys[k]) > 5:
                 untranslated.append(k)
    
    if untranslated:
        print(f"\nPotentially untranslated ({len(untranslated)} keys):")
        for k in untranslated[:20]: # Show only first 20
            print(f"  {k}")
        if len(untranslated) > 20:
            print(f"  ... and {len(untranslated) - 20} more")

if __name__ == "__main__":
    check_parity()
