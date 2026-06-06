import json
from collections import defaultdict
import sys
import os

# Force UTF-8 for output
sys.stdout.reconfigure(encoding='utf-8')

report_path = r'e:\kitchen-store-inventory-system\apps\web\lint-report.json'

with open(report_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

rule_counts = defaultdict(int)
for file_entry in data:
    for msg in file_entry.get('messages', []):
        if msg.get('severity') == 2:
            rule_counts[msg.get('ruleId', 'unknown')] += 1

print("Rule Counts:")
for rule, count in sorted(rule_counts.items(), key=lambda x: x[1], reverse=True):
    print(f"{rule}: {count}")
