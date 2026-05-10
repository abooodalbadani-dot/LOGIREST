import json
import os
import re

def is_arabic(text):
    if not isinstance(text, str):
        return False
    return any('\u0600' <= char <= '\u06FF' for char in text)

def sort_dict(d):
    if isinstance(d, dict):
        return {k: sort_dict(v) for k, v in sorted(d.items())}
    return d

def sync_keys(target, source, prefix="", is_en=True):
    for k, v in source.items():
        full_key = f"{prefix}.{k}" if prefix else k
        if k not in target:
            if isinstance(v, dict):
                target[k] = {}
                sync_keys(target[k], v, full_key, is_en)
            else:
                tag = "MISSING_EN" if is_en else "MISSING_AR"
                target[k] = f"[{tag}] {v}"
                print(f"Added missing key to {'EN' if is_en else 'AR'}: {full_key}")
        else:
            if isinstance(v, dict) and isinstance(target[k], dict):
                sync_keys(target[k], v, full_key, is_en)
            elif isinstance(v, dict) or isinstance(target[k], dict):
                print(f"Type mismatch at {full_key}")

def fix_identicals(en, ar, prefix=""):
    for k, v in en.items():
        full_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            if k in ar and isinstance(ar[k], dict):
                fix_identicals(v, ar[k], full_key)
        else:
            if k in ar and v == ar[k] and is_arabic(v):
                print(f"Found Arabic in EN at {full_key}: {v}")

def main():
    en_path = 'apps/web/messages/en.json'
    ar_path = 'apps/web/messages/ar.json'
    
    with open(en_path, 'r', encoding='utf-8') as f:
        en = json.load(f)
    with open(ar_path, 'r', encoding='utf-8') as f:
        ar = json.load(f)
        
    # Sync EN from AR
    sync_keys(en, ar, is_en=True)
    # Sync AR from EN
    sync_keys(ar, en, is_en=False)
    
    # Sort
    en = sort_dict(en)
    ar = sort_dict(ar)
    
    # Detect Arabic in EN
    fix_identicals(en, ar)
    
    with open(en_path, 'w', encoding='utf-8') as f:
        json.dump(en, f, ensure_ascii=False, indent=2)
    with open(ar_path, 'w', encoding='utf-8') as f:
        json.dump(ar, f, ensure_ascii=False, indent=2)
        
    print("Sync and Sort complete.")

if __name__ == "__main__":
    main()
