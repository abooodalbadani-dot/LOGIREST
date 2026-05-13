import json
import sys

def find_line_number(filename, target_path):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    parts = target_path.split('.')
    current_depth = 0
    
    for i, line in enumerate(lines):
        if f'"{parts[current_depth]}"' in line:
            current_depth += 1
            if current_depth == len(parts):
                return i + 1
    return -1

print(f"EN line: {find_line_number('E:/Kitchen\u2011Store Inventory System/apps/web/messages/en.json', 'operations.issue')}")
print(f"AR line: {find_line_number('E:/Kitchen\u2011Store Inventory System/apps/web/messages/ar.json', 'operations.issue')}")
