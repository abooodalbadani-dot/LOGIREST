import json
import os

files = [
    r'C:\kitchen-store-inventory-system\apps\web\messages\ar.json',
    r'C:\kitchen-store-inventory-system\apps\web\messages\en.json'
]

for filepath in files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Navigate to master_data -> suppliers
        if 'master_data' in data and 'suppliers' in data['master_data']:
            suppliers = data['master_data']['suppliers']
            
            # Ensure metrics exists
            if 'metrics' not in suppliers:
                suppliers['metrics'] = {}
                
            is_ar = filepath.endswith('ar.json')
            
            # Add total_suppliers
            suppliers['metrics']['total_suppliers'] = 'إجمالي الموردين' if is_ar else 'Total Suppliers'
            
            # Add search_placeholder
            suppliers['search_placeholder'] = 'البحث عن الموردين بالكود أو الاسم...' if is_ar else 'Search suppliers by code or name...'

            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                
            print(f"Updated {filepath}")
