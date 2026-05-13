import json

def list_top_level_keys(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"Top-level keys in {file_path}:")
    for key in sorted(data.keys()):
        print(f"- {key}")

list_top_level_keys('apps/web/messages/en.json')
list_top_level_keys('apps/web/messages/ar.json')
