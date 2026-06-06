
import json
import os

file_path = r'E:\kitchen-store-inventory-system\apps\web\messages\ar.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Fix common.statuses
if 'common' in data and 'statuses' in data['common']:
    data['common']['statuses']['all'] = "الكل"
    data['common']['statuses']['draft'] = "مسودة"

# Fix common.warehouses
if 'common' in data and 'warehouses' in data['common']:
    data['common']['warehouses']['main'] = "المستودع الرئيسي"

# Add operations.issue.warehouse_locked
if 'operations' in data:
    if 'issue' not in data['operations']:
        data['operations']['issue'] = {}
    data['operations']['issue']['warehouse_locked'] = "المستودع مقفل"

# Ensure common.warehouse_locked exists too if needed
if 'common' in data:
    data['common']['warehouse_locked'] = "المستودع مقفل"

with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Successfully updated ar.json")
