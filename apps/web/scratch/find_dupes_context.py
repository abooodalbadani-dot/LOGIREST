import json

def check_duplicates(ordered_pairs, path=""):
    seen = {}
    for i, (k, v) in enumerate(ordered_pairs):
        if k in seen:
            print(f"DUPLICATE KEY: '{k}' in object at {path}")
        seen[k] = v
    return dict(ordered_pairs)

def find_duplicates_with_context(file_path):
    print(f"Checking {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        lines = content.splitlines()
    
    # Simple line-based search for duplicates to help identification
    keys_at_level = {} # level -> list of (key, line_no)
    current_level = 0
    
    # This is hard to do perfectly with just regex, so let's just use the json parser 
    # and print some context if we can.
    
    # Re-running the original script logic but with more info
    def hook(pairs):
        seen = set()
        for k, v in pairs:
            if k in seen:
                print(f"Found duplicate key: {k}")
            seen.add(k)
        return dict(pairs)

    json.loads(content, object_pairs_hook=hook)

find_duplicates_with_context('apps/web/messages/en.json')
