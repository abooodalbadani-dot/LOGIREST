import json

file_path = r'e:\Kitchen‑Store Inventory System\apps\web\messages\ar.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Fix keys in 'common'
if 'common' in data:
    common = data['common']
    if 'warehouseLocked' in common:
        common['warehouse_locked'] = common.pop('warehouseLocked')
    if 'stocktakeInProgressDesc' in common:
        common['stocktake_in_progress_desc'] = common.pop('stocktakeInProgressDesc')
    
    # Ensure manual_entry, export, loading are there
    if 'manual_entry' not in common:
        common['manual_entry'] = 'إدخال يدوي'
    if 'export' not in common:
        common['export'] = 'تصدير'
    if 'loading' not in common:
        common['loading'] = 'جاري التحميل...'

# Remove any accidentally added keys at the top level of common if they exist
# Wait, the structure is data['common']['warehouse_locked'] etc.

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
