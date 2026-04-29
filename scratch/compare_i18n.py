import json

def get_keys(data, prefix=''):
    keys = set()
    if isinstance(data, dict):
        for k, v in data.items():
            keys.update(get_keys(v, f"{prefix}{k}."))
    elif isinstance(data, list):
        # We don't usually track list indices as keys in i18n
        pass
    else:
        keys.add(prefix[:-1])
    return keys

def compare_json(file1, file2):
    with open(file1, 'r', encoding='utf-8') as f1:
        data1 = json.load(f1)
    with open(file2, 'r', encoding='utf-8') as f2:
        data2 = json.load(f2)
    
    keys1 = get_keys(data1)
    keys2 = get_keys(data2)
    
    only_in_1 = sorted(list(keys1 - keys2))
    only_in_2 = sorted(list(keys2 - keys1))
    
    print(f"Keys only in {file1}:")
    for k in only_in_1:
        print(f"  {k}")
    
    print(f"\nKeys only in {file2}:")
    for k in only_in_2:
        print(f"  {k}")

if __name__ == "__main__":
    compare_json(r"messages\en.json", r"messages\ar.json")
