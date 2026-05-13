import json

with open('apps/web/messages/en.json', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '"operations": {' in line:
        print(f"Line {i+1}: {line.strip()}")
    if '"adjustment": {' in line:
        print(f"Line {i+1}: {line.strip()}")
