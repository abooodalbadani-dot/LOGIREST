
import json
import sys
import collections

def find_duplicate_keys(obj, path=""):
    if isinstance(obj, dict):
        keys = list(obj.keys())
        for key in keys:
            find_duplicate_keys(obj[key], f"{path}.{key}" if path else key)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            find_duplicate_keys(item, f"{path}[{i}]")

def get_duplicates_manually(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We want to find if keys are repeated at the same level.
    # A simple way is to use a custom object_pairs_hook
    def detect_duplicates(pairs):
        keys = [p[0] for p in pairs]
        dupes = [k for k, count in collections.Counter(keys).items() if count > 1]
        if dupes:
            print(f"Duplicates in {filename}: {dupes}")
        
        result = {}
        for k, v in pairs:
            if k in result:
                # Merge or report?
                pass
            result[k] = v
        return result

    try:
        json.loads(content, object_pairs_hook=detect_duplicates)
    except Exception as e:
        print(f"Error parsing {filename}: {e}")

if __name__ == "__main__":
    get_duplicates_manually('messages/en.json')
    get_duplicates_manually('messages/ar.json')
