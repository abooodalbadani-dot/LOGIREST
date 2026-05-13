import json
import sys

def deep_merge(dict1, dict2):
    for key, value in dict2.items():
        if key in dict1 and isinstance(dict1[key], dict) and isinstance(value, dict):
            deep_merge(dict1[key], value)
        else:
            dict1[key] = value
    return dict1

def object_pairs_hook(pairs):
    d = {}
    for k, v in pairs:
        if k in d:
            if isinstance(d[k], dict) and isinstance(v, dict):
                d[k] = deep_merge(d[k], v)
            else:
                d[k] = v
        else:
            d[k] = v
    return d

def clean_json(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # This will recursively merge all duplicate keys
    data = json.loads(content, object_pairs_hook=object_pairs_hook)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Cleaned {file_path}")

if __name__ == "__main__":
    for path in sys.argv[1:]:
        clean_json(path)
