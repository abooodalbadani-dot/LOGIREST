import re

with open("e:/kitchen-store-inventory-system/apps/web/messages/en.json", 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if re.match(r'^\s+"[a-z_]+": \{', line):
            # Check indentation
            indent = len(line) - len(line.lstrip())
            if indent == 2:
                print(f"Top-level key at line {i+1}: {line.strip()}")
            elif indent == 4:
                print(f"Second-level key at line {i+1}: {line.strip()}")
        if i > 3000:
            break
