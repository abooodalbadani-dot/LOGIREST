import json

def update_json_recursive(data, new_keys):
    for key, value in new_keys.items():
        if isinstance(value, dict) and key in data and isinstance(data[key], dict):
            update_json_recursive(data[key], value)
        else:
            data[key] = value

new_keys_en = {
    "masterData": {
        "common": {
            "basic_info_desc": "Core Entity Identification",
            "operational_details_desc": "Management and financial mapping",
            "status_description": "Control the visibility and operational availability of this unit.",
            "sku_definition_protocol": "SKU Definition Protocol",
            "master_data_sync": "Master Data Sync",
            "placeholder_sku": "SKU-000-000",
            "null_select": "— NULL SELECT —",
            "select_base_unit": "— SELECT BASE UNIT —",
            "source_unit": "SOURCE UNIT",
            "target_unit": "TARGET UNIT",
            "operational_availability": "Operational Availability",
            "threshold_parameters": "Threshold Parameters",
            "inventory_taxonomy_units": "Inventory Taxonomy & Units",
            "relational_unit_transformation": "Relational Unit Transformation"
        }
    }
}

new_keys_ar = {
    "masterData": {
        "common": {
            "basic_info_desc": "التعريف الأساسي للكيان",
            "operational_details_desc": "الإدارة والربط المالي",
            "status_description": "التحكم في الرؤية والتوافر التشغيلي لهذه الوحدة.",
            "sku_definition_protocol": "بروتوكول تعريف SKU",
            "master_data_sync": "مزامنة البيانات الأساسية",
            "placeholder_sku": "SKU-000-000",
            "null_select": "— اختيار فارغ —",
            "select_base_unit": "— اختر الوحدة الأساسية —",
            "source_unit": "الوحدة المصدر",
            "target_unit": "الوحدة الهدف",
            "operational_availability": "التوافر التشغيلي",
            "threshold_parameters": "معايير العتبة",
            "inventory_taxonomy_units": "تصنيف المخزون والوحدات",
            "relational_unit_transformation": "تحويل الوحدات العلائقي"
        }
    }
}

for lang, keys in [('en', new_keys_en), ('ar', new_keys_ar)]:
    file_path = f'messages/{lang}.json'
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    update_json_recursive(data, keys)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
