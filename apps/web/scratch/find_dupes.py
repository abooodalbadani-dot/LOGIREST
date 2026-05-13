import json

def check_duplicates(ordered_pairs):
    seen = set()
    for k, v in ordered_pairs:
        if k in seen:
            print(f"DUPLICATE KEY: {k}")
        seen.add(k)
    return dict(ordered_pairs)

def find_real_duplicates(file_path):
    print(f"Checking {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        try:
            json.load(f, object_pairs_hook=check_duplicates)
        except Exception as e:
            print(f"Error: {e}")

find_real_duplicates('apps/web/messages/ar.json')
find_real_duplicates('apps/web/messages/en.json')
