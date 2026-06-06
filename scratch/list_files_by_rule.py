import json
import sys
from collections import defaultdict

# Force UTF-8 for output
sys.stdout.reconfigure(encoding='utf-8')

report_path = r'e:\kitchen-store-inventory-system\apps\web\lint-report.json'
target_rule = 'react-hooks/set-state-in-effect'

with open(report_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

files = defaultdict(list)
for file_entry in data:
    for msg in file_entry.get('messages', []):
        if msg.get('ruleId') == target_rule:
            files[file_entry['filePath']].append(msg['line'])

print(f"Files with {target_rule}:")
for file_path, lines in files.items():
    print(f"{file_path}: lines {lines}")
