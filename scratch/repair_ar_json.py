import json
import os

def recursive_merge(d1, d2):
    for k, v in d2.items():
        if k in d1 and isinstance(d1[k], dict) and isinstance(v, dict):
            recursive_merge(d1[k], v)
        else:
            d1[k] = v

def object_pairs_hook_merge(pairs):
    d = {}
    for k, v in pairs:
        if k in d and isinstance(d[k], dict) and isinstance(v, dict):
            recursive_merge(d[k], v)
        else:
            d[k] = v
    return d

def repair_and_clean_ar_json():
    file_path = 'apps/web/messages/ar.json'
    with open(file_path, 'rb') as f:
        content = f.read()

    # 1. Fix the corruption at byte 90919
    # The pattern we found: b'"export": "\xd8\xaa\xd8\xb5\xd8\xaf\xd9\x8a\xd8\xb1 \xd8  }\r\n}\r\n'
    # We want to replace it with something valid.
    # Looking at en.json, it should be part of a larger object.
    
    bad_pattern = b'"export": "\xd8\xaa\xd8\xb5\xd8\xaf\xd9\x8a\xd8\xb1 \xd8  }\r\n}\r\n'
    good_replacement = b'"export": "\xd8\xaa\xd8\xb5\xd8\xaf\xd9\x8a\xd8\xb1",\n'
    
    if bad_pattern in content:
        print("Found and fixing corruption at 90919...")
        content = content.replace(bad_pattern, good_replacement)
    else:
        print("Corruption pattern not found exactly, trying fuzzy match...")
        # Fuzzy match: just find the "export": "..." that ends with } }
        content_str = content.decode('utf-8', errors='replace')
        import re
        content_str = re.sub(r'"export": "تصدير .*?}\s*}\s*', r'"export": "تصدير",\n', content_str)
        content = content_str.encode('utf-8')

    # 2. Parse and merge duplicate keys
    try:
        # We use 'replace' for decoding to handle any other minor bad bytes
        data = json.loads(content.decode('utf-8', errors='replace'), object_pairs_hook=object_pairs_hook_merge)
        
        # 3. Save it back
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("Successfully repaired and merged ar.json")
    except Exception as e:
        print(f"Error during JSON processing: {e}")
        # If it fails, let's try to output the line number
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    repair_and_clean_ar_json()
