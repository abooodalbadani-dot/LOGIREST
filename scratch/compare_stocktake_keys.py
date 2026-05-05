
import json

def compare_keys(obj1, obj2, path=""):
    keys1 = set(obj1.keys()) if isinstance(obj1, dict) else set()
    keys2 = set(obj2.keys()) if isinstance(obj2, dict) else set()
    
    only_in_1 = keys1 - keys2
    only_in_2 = keys2 - keys1
    common = keys1 & keys2
    
    if only_in_1:
        print(f"Only in EN {path}: {only_in_1}")
    if only_in_2:
        print(f"Only in AR {path}: {only_in_2}")
        
    for key in common:
        if isinstance(obj1[key], dict) and isinstance(obj2[key], dict):
            compare_keys(obj1[key], obj2[key], f"{path}.{key}" if path else key)

with open('messages/en.json', 'r', encoding='utf-8') as f:
    en = json.load(f)
with open('messages/ar.json', 'r', encoding='utf-8') as f:
    ar = json.load(f)

compare_keys(en['operations']['stocktake'], ar['operations']['stocktake'], "operations.stocktake")
