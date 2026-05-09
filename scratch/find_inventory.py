import re

def find_key_occurrences(file_path, key):
    with open(file_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f, 1):
            if re.search(fr'^  "{key}":', line):
                print(f"{file_path}:{i}: {line.strip()}")

find_key_occurrences('apps/web/messages/en.json', 'inventory')
find_key_occurrences('apps/web/messages/ar.json', 'inventory')
