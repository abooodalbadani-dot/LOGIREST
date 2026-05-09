import json

def find_duplicate_keys(obj, path=""):
    if isinstance(obj, dict):
        keys = list(obj.keys())
        # We can't actually find duplicate keys this way because json.loads() overwrites them
        # We need a custom decoder or to read the file line by line
        pass

def find_duplicates_raw(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        stack = []
        path = []
        duplicates = []
        
        # Simple heuristic: check for same key at same level
        # This is hard to do perfectly without a full parser that preserves duplicates
        # But we can look for "key": multiple times within the same { } block
        
        # Actually, let's use a simpler approach: 
        # For each line like "key": ..., store the key and the current nesting level
        # If we see it again at the same level before the block closes, it's a duplicate.
        
        level = 0
        keys_at_level = {}
        
        for i, line in enumerate(f, 1):
            line = line.strip()
            if line.endswith('{'):
                level += 1
                keys_at_level[level] = set()
            elif line.startswith('}'):
                if level in keys_at_level:
                    del keys_at_level[level]
                level -= 1
            elif '"' in line and ':' in line:
                key = line.split('"')[1]
                if level in keys_at_level:
                    if key in keys_at_level[level]:
                        print(f"Duplicate key '{key}' at line {i}")
                    else:
                        keys_at_level[level].add(key)

if __name__ == "__main__":
    import sys
    find_duplicates_raw(sys.argv[1])
