import json

def find_duplicates(path):
    print(f"Checking {path} for duplicate keys...")
    with open(path, 'rb') as f:
        content = f.read().decode('utf-8')
    
    def dict_raise_on_duplicates(ordered_pairs):
        """Reject duplicate keys."""
        d = {}
        for k, v in ordered_pairs:
            if k in d:
                print(f"Duplicate key found: {k}")
            d[k] = v
        return d

    try:
        json.loads(content, object_pairs_hook=dict_raise_on_duplicates)
        print("Done checking.")
    except Exception as e:
        print(f"Error during parsing: {e}")

if __name__ == "__main__":
    find_duplicates('apps/web/messages/ar.json')
