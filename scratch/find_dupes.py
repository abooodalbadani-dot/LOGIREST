import re

def find_duplicates(file_path):
    keys = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            match = re.search(r'^  "([^"]+)":', line)
            if match:
                keys.append(match.group(1))
    
    seen = set()
    dupes = set()
    for k in keys:
        if k in seen:
            dupes.add(k)
        seen.add(k)
    return dupes

print(f"Duplicates in en.json: {find_duplicates('apps/web/messages/en.json')}")
print(f"Duplicates in ar.json: {find_duplicates('apps/web/messages/ar.json')}")
