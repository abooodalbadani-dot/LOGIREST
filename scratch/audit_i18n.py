
import json
import os

def compare_json(base_file, target_file):
    with open(base_file, 'r', encoding='utf-8') as f:
        base_data = json.load(f)
    with open(target_file, 'r', encoding='utf-8') as f:
        target_data = json.load(f)

    def get_keys(data, prefix=''):
        keys = set()
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                keys.update(get_keys(v, full_key))
            else:
                keys.add(full_key)
        return keys

    base_keys = get_keys(base_data)
    target_keys = get_keys(target_data)

    missing_in_target = sorted(list(base_keys - target_keys))
    extra_in_target = sorted(list(target_keys - base_keys))

    print(f"Missing keys: {len(missing_in_target)}")
    for key in missing_in_target[:50]: # Show first 50
        print(f"  - {key}")
    if len(missing_in_target) > 50:
        print(f"  ... and {len(missing_in_target) - 50} more")

    # Check for English values in Arabic file
    def check_english_values(data, prefix=''):
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                check_english_values(v, full_key)
            elif isinstance(v, str):
                # Simple check for English characters (A-Z, a-z) without Arabic
                has_english = any('a' <= char <= 'z' or 'A' <= char <= 'Z' for char in v)
                has_arabic = any('\u0600' <= char <= '\u06FF' for char in v)
                if has_english and not has_arabic and len(v) > 2:
                    try:
                        print(f"Potentially untranslated: {full_key} -> {v}")
                    except UnicodeEncodeError:
                        print(f"Potentially untranslated: {full_key}")

    print("\nChecking for potentially untranslated strings in Arabic file:")
    check_english_values(target_data)

base = r'e:\Kitchen‑Store Inventory System\apps\web\messages\en.json'
target = r'e:\Kitchen‑Store Inventory System\apps\web\messages\ar.json'
compare_json(base, target)
