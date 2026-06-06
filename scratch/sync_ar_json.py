import json
import os

en_path = r'e:\kitchen-store-inventory-system\apps\web\messages\en.json'
ar_path = r'e:\kitchen-store-inventory-system\apps\web\messages\ar.json'

with open(en_path, 'r', encoding='utf-8') as f:
    en_data = json.load(f)

with open(ar_path, 'r', encoding='utf-8') as f:
    ar_data = json.load(f)

# Translations for the identified empty keys
translations = {
    "issue.description": "الاستهلاك الداخلي للمخزون وصرف الأقسام.",
    "transfer.description": "التحويلات الداخلية بين المستودعات وتتبع الحركة.",
    "po.no_orders_desc": "ابدأ في شراء الأصناف عن طريق إنشاء أول أمر شراء.",
    "pr.no_requests_desc": "ابدأ دورة المشتريات عن طريق إنشاء طلب جديد."
}

def update_nested_key(data, key_path, value):
    keys = key_path.split('.')
    current = data
    for key in keys[:-1]:
        if key in current:
            current = current[key]
        else:
            return False
    if keys[-1] in current:
        current[keys[-1]] = value
        return True
    return False

# 1. Update the empty keys
for key_path, value in translations.items():
    if update_nested_key(ar_data, key_path, value):
        print(f"Updated {key_path}")
    else:
        print(f"Could not find {key_path}")

# 2. Remove extra manual_entry at root if it exists
if 'manual_entry' in ar_data:
    del ar_data['manual_entry']
    print("Removed root-level manual_entry")

# Save the updated ar.json
with open(ar_path, 'w', encoding='utf-8') as f:
    json.dump(ar_data, f, ensure_ascii=False, indent=2)

print("Finished updating ar.json")
