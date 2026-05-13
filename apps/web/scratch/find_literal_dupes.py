import json

def find_literal_duplicates(file_path):
    def dict_raise_on_duplicates(ordered_pairs):
        d = {}
        for k, v in ordered_pairs:
            if k in d:
                print(f"Duplicate key found: {k}")
            d[k] = v
        return d

    print(f"Checking {file_path} for literal duplicate keys...")
    with open(file_path, 'r', encoding='utf-8') as f:
        json.load(f, object_pairs_hook=dict_raise_on_duplicates)

find_literal_duplicates('apps/web/messages/en.json')
find_literal_duplicates('apps/web/messages/ar.json')
