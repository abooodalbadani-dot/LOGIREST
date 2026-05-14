import json
import collections

def find_duplicates(obj, path=""):
    if isinstance(obj, dict):
        keys = collections.Counter(obj.keys())
        for key, count in keys.items():
            if count > 1:
                print(f"Duplicate key: {path}.{key}")
            find_duplicates(obj[key], f"{path}.{key}")

with open('apps/web/messages/en.json', 'r', encoding='utf-8') as f:
    # Note: json.load will automatically handle duplicates by keeping the last one.
    # To detect them, we need a custom decoder or manually parse.
    content = f.read()

# Simple manual check for top-level keys under common
import re
common_match = re.search(r'"common":\s*\{', content)
if common_match:
    start = common_match.end()
    # Find end of common block (simple count of braces)
    braces = 1
    end = start
    while braces > 0 and end < len(content):
        if content[end] == '{': braces += 1
        elif content[end] == '}': braces -= 1
        end += 1
    common_content = content[start:end]
    keys = re.findall(r'"(\w+)":', common_content)
    seen = {}
    for i, key in enumerate(keys):
        if key in seen:
            print(f"Duplicate key in 'common': {key}")
        seen[key] = True
