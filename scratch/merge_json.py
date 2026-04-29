import json
import collections

def deep_merge(dict1, dict2):
    for k, v in dict2.items():
        if k in dict1 and isinstance(dict1[k], dict) and isinstance(v, dict):
            deep_merge(dict1[k], v)
        else:
            dict1[k] = v
    return dict1

def merge_json_with_duplicates(file_path):
    # Since json.load handles duplicates by taking the last one,
    # we need to manually find all blocks and merge them.
    # Alternatively, we can use a library or just parse it ourselves.
    
    # Actually, if I use a custom hook for the parser, I can merge them during loading.
    from json import JSONDecoder

    def parse_object(pairs):
        d = {}
        for k, v in pairs:
            if k in d and isinstance(d[k], dict) and isinstance(v, dict):
                deep_merge(d[k], v)
            else:
                d[k] = v
        return d

    decoder = JSONDecoder(object_pairs_hook=parse_object)
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    return decoder.decode(content)

def fix_file(file_path):
    merged = merge_json_with_duplicates(file_path)
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    print(f"Fixed {file_path}")

if __name__ == "__main__":
    fix_file(r"messages\en.json")
    fix_file(r"messages\ar.json")
