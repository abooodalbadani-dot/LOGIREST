import json

with open('apps/web/messages/en.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def find_path(d, target, path=""):
    if isinstance(d, dict):
        for k, v in d.items():
            new_path = f"{path}.{k}" if path else k
            if k == target:
                print(f"Found '{target}' at path: {new_path}")
            find_path(v, target, new_path)

find_path(data, "operations")
find_path(data, "adjustment")
