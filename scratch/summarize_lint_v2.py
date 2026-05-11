import json
from collections import defaultdict
import sys
import os

# Force UTF-8 for output
sys.stdout.reconfigure(encoding='utf-8')

report_path = r'e:\Kitchen‑Store Inventory System\apps\web\lint-report.json'

if not os.path.exists(report_path):
    print(f"File not found: {report_path}")
    exit(1)

with open(report_path, 'r', encoding='utf-8') as f:
    try:
        data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
        exit(1)

rule_files = defaultdict(set)
for file_entry in data:
    for msg in file_entry.get('messages', []):
        if msg.get('severity') == 2: # Error
            rule_id = msg.get('ruleId', 'unknown')
            file_path = file_entry.get('filePath', 'unknown')
            # Make path relative to workspace root for readability
            rel_path = os.path.relpath(file_path, r'e:\Kitchen‑Store Inventory System')
            rule_files[rule_id].add(rel_path)

print("Detailed Error Summary:")
for rule in sorted(rule_files.keys(), key=lambda r: len(rule_files[r]), reverse=True):
    # Only show rules we care about for this task
    if rule in ['react-hooks/rules-of-hooks', 'react-hooks/exhaustive-deps', 'react-hooks/set-state-in-effect', '@typescript-eslint/no-explicit-any']:
        print(f"\n{rule} ({len(rule_files[rule])} files):")
        for file_path in sorted(rule_files[rule]):
            print(f"  - {file_path}")
