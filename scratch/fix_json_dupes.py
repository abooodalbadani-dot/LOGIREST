
import json
import collections

def deep_merge(dict1, dict2):
    """
    Recursive deep merge of two dictionaries.
    """
    for key, value in dict2.items():
        if key in dict1 and isinstance(dict1[key], dict) and isinstance(value, dict):
            deep_merge(dict1[key], value)
        else:
            dict1[key] = value
    return dict1

def fix_json_file(filename):
    print(f"Fixing {filename}...")
    
    # We need to load the JSON while preserving all values for duplicate keys.
    # Python's json.loads with a custom object_pairs_hook can do this.
    
    def merge_pairs(pairs):
        result = {}
        for k, v in pairs:
            if k in result:
                if isinstance(result[k], dict) and isinstance(v, dict):
                    deep_merge(result[k], v)
                else:
                    # For non-dict values, later one wins
                    result[k] = v
            else:
                result[k] = v
        return result

    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    try:
        # This will recursively merge any duplicates found at any level
        fixed_data = json.loads(content, object_pairs_hook=merge_pairs)
        
        # Write back the fixed JSON
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(fixed_data, f, ensure_ascii=False, indent=2)
        print(f"Successfully fixed {filename}")
    except Exception as e:
        print(f"Error processing {filename}: {e}")

if __name__ == "__main__":
    fix_json_file('messages/en.json')
    fix_json_file('messages/ar.json')
