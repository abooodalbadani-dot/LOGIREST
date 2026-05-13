import json

def check_root_duplicates(path):
    with open(path, 'rb') as f:
        raw = f.read().decode('utf-8')
    
    def dict_hook(pairs):
        keys = [k for k, v in pairs]
        if len(keys) != len(set(keys)):
            dups = [k for k in set(keys) if keys.count(k) > 1]
            print(f"Duplicates found: {dups}")
        return dict(pairs)

    json.loads(raw, object_pairs_hook=dict_hook)

if __name__ == "__main__":
    check_root_duplicates('apps/web/messages/ar.json')
