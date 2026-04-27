import json
from collections import defaultdict
import re
import sys

# Force UTF-8 for output
sys.stdout.reconfigure(encoding='utf-8')

with open('lint-results.json', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'\[.*\]', content, re.DOTALL)
if match:
    json_str = match.group(0)
    data = json.loads(json_str)
else:
    print("Could not find JSON array in file")
    exit(1)

rule_files = defaultdict(set)
for file in data:
    for msg in file['messages']:
        if msg['severity'] == 2:
            rule_files[msg['ruleId']].add(file['filePath'])

print("Detailed Error Summary:")
for rule in sorted(rule_files.keys(), key=lambda r: len(rule_files[r]), reverse=True):
    print(f"\n{rule} ({len(rule_files[rule])} files):")
    for file_path in sorted(rule_files[rule]):
        # Clean the file path if it contains the problematic characters
        print(f"  - {file_path}")
