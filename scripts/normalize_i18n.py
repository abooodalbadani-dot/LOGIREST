import json
import os

def merge_dicts(d1, d2):
    for k, v in d2.items():
        if k in d1 and isinstance(d1[k], dict) and isinstance(v, dict):
            merge_dicts(d1[k], v)
        else:
            d1[k] = v

def normalize_json(file_path):
    # We can't use json.load because it might skip duplicate keys or error
    # But actually, the file is a single object with duplicate keys.
    # Most JSON parsers will just take the last key.
    # To properly merge them, we might need a custom parser or just read it as a string and find all occurrences.
    
    # Let's try to read it line by line and find top-level objects.
    # Or more simply, since we know 'procurement' is duplicated, we can use a library that supports duplicate keys.
    
    # Alternatively, we can use a regex to find all top-level keys and their contents.
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # This is a bit hacky, but since we have a specific issue with 'procurement',
    # we can find all instances of "procurement": { ... } and merge them.
    
    # A better way: Use a JSON parser that returns a list of pairs or supports duplicate keys.
    # Python's json.loads with object_pairs_hook can help.
    
    def object_pairs_hook(pairs):
        result = {}
        for k, v in pairs:
            if k in result:
                if isinstance(result[k], dict) and isinstance(v, dict):
                    merge_dicts(result[k], v)
                else:
                    result[k] = v
            else:
                result[k] = v
        return result

    data = json.loads(content, object_pairs_hook=object_pairs_hook)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    normalize_json('messages/en.json')
    normalize_json('messages/ar.json')
    print("Normalization complete.")
