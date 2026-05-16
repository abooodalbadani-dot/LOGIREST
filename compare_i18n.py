import json
import sys

def get_keys(data, prefix=''):
    keys = set()
    if isinstance(data, dict):
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            keys.add(full_key)
            keys.update(get_keys(v, full_key))
    elif isinstance(data, list):
        for i, v in enumerate(data):
            full_key = f"{prefix}[{i}]"
            keys.add(full_key)
            keys.update(get_keys(v, full_key))
    return keys

def compare_json(file1, file2):
    with open(file1, 'r', encoding='utf-8') as f:
        data1 = json.load(f)
    with open(file2, 'r', encoding='utf-8') as f:
        data2 = json.load(f)
    
    keys1 = get_keys(data1)
    keys2 = get_keys(data2)
    
    missing_in_2 = sorted(list(keys1 - keys2))
    missing_in_1 = sorted(list(keys2 - keys1))
    
    return missing_in_2, missing_in_1

if __name__ == "__main__":
    f1 = sys.argv[1]
    f2 = sys.argv[2]
    m2, m1 = compare_json(f1, f2)
    
    print(f"Missing in {f2}:")
    for k in m2:
        print(f"  {k}")
    
    print(f"\nMissing in {f1}:")
    for k in m1:
        print(f"  {k}")
