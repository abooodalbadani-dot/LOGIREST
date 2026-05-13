import re

def find_line_numbers(filename, pattern):
    with open(filename, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if pattern in line:
                print(f"{filename} Line {i+1}: {line.strip()}")

find_line_numbers('apps/web/messages/en.json', '"common": {')
find_line_numbers('apps/web/messages/ar.json', '"common": {')
