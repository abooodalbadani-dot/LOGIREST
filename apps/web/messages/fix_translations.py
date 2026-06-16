import json

def fix_translation(file_path, new_key, new_val_ar_en):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if 'uoms' in data['master_data'] and 'validation' in data['master_data']['uoms']:
        data['master_data']['uoms']['validation']['name_required'] = new_val_ar_en
        
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Fixed {file_path}")

fix_translation('apps/web/messages/ar.json', 'name_required', 'اسم الوحدة مطلوب')
fix_translation('apps/web/messages/en.json', 'name_required', 'UoM Name is required')
