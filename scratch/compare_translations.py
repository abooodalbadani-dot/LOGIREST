import json
import os

def compare_translations(en_path, ar_path):
    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
    with open(ar_path, 'r', encoding='utf-8') as f:
        ar_data = json.load(f)

    def get_keys(data, prefix=''):
        keys = set()
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                keys.update(get_keys(v, full_key))
            else:
                keys.add(full_key)
        return keys

    en_keys = get_keys(en_data)
    ar_keys = get_keys(ar_data)

    missing_in_ar = en_keys - ar_keys
    missing_in_en = ar_keys - en_keys

    def get_values(data, keys):
        values = {}
        for key in keys:
            parts = key.split('.')
            val = data
            for p in parts:
                val = val.get(p, {})
            values[key] = val
        return values

    en_vals = get_values(en_data, en_keys)
    ar_vals = get_values(ar_data, ar_keys)

    potential_untranslated = []
    common_keys = en_keys & ar_keys
    for key in common_keys:
        en_val = en_vals[key]
        ar_val = ar_vals[key]
        
        # If they are identical and contain English characters but no Arabic, might be untranslated
        # Excluding some common keys like "en", "ar", codes, numbers, symbols
        if en_val == ar_val and any(c.isalpha() for c in en_val):
            # Check if it has Arabic characters
            has_arabic = any('\u0600' <= c <= '\u06FF' for c in ar_val)
            if not has_arabic:
                potential_untranslated.append((key, en_val))

    return {
        "missing_in_ar": sorted(list(missing_in_ar)),
        "missing_in_en": sorted(list(missing_in_en)),
        "potential_untranslated": potential_untranslated
    }

if __name__ == "__main__":
    en_file = r'e:/Kitchen‑Store Inventory System/apps/web/messages/en.json'
    ar_file = r'e:/Kitchen‑Store Inventory System/apps/web/messages/ar.json'
    
    results = compare_translations(en_file, ar_file)
    
    print(f"Missing in AR: {len(results['missing_in_ar'])}")
    for k in results['missing_in_ar']:
        print(f"  - {k}")
        
    print(f"\nMissing in EN: {len(results['missing_in_en'])}")
    for k in results['missing_in_en']:
        print(f"  - {k}")
        
    print(f"\nPotential Untranslated in AR (Matches EN): {len(results['potential_untranslated'])}")
    for k, v in results['potential_untranslated']:
        print(f"  - {k}: {v}")
