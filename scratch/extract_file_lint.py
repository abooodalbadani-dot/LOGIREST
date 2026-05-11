import json
import sys

# Force UTF-8 for output
sys.stdout.reconfigure(encoding='utf-8')

report_path = r'e:\Kitchen‑Store Inventory System\apps\web\lint-report.json'
target_file = 'ProtectedRoute.tsx'

with open(report_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

for file_entry in data:
    if target_file in file_entry['filePath']:
        print(f"Errors for {file_entry['filePath']}:")
        for msg in file_entry['messages']:
            print(f"  Line {msg['line']}: {msg.get('ruleId')} - {msg.get('message')}")
