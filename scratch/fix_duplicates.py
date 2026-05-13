import json
import collections

def clean_duplicates(file_path):
    print(f"Cleaning duplicates in {file_path}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    def object_pairs_hook(pairs):
        d = {}
        for k, v in pairs:
            if k in d:
                print(f"  Removing duplicate key '{k}' at same level.")
                print(f"    Old value: {d[k]}")
                print(f"    New value: {v}")
            d[k] = v
        return d

    data = json.loads(content, object_pairs_hook=object_pairs_hook)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Done.")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python fix_duplicates.py <file_path>")
    else:
        clean_duplicates(sys.argv[1])
