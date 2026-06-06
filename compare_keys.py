
import json

def compare_json(file1, file2, section):
    with open(file1, 'r', encoding='utf-8') as f1, open(file2, 'r', encoding='utf-8') as f2:
        data1 = json.load(f1)
        data2 = json.load(f2)
    
    keys1 = set(data1.get(section, {}).keys())
    keys2 = set(data2.get(section, {}).keys())
    
    missing_in_2 = keys1 - keys2
    missing_in_1 = keys2 - keys1
    
    return missing_in_2, missing_in_1

en_path = 'e:/kitchen-store-inventory-system/apps/web/messages/en.json'
ar_path = 'e:/kitchen-store-inventory-system/apps/web/messages/ar.json'


for section in ['common', 'dashboard', 'inventory', 'operational', 'admin']:
    missing_in_ar, missing_in_en = compare_json(en_path, ar_path, section)
    print(f"--- Section: {section} ---")
    print(f"Keys missing in AR: {missing_in_ar}")
    print(f"Keys missing in EN: {missing_in_en}")

