import json

def get_keys(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return list(data.keys())

print(f"EN Top-level keys: {get_keys('apps/web/messages/en.json')}")
print(f"AR Top-level keys: {get_keys('apps/web/messages/ar.json')}")
