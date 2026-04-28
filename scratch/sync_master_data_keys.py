import json
import os

def update_json(file_path, updates):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    def deep_update(source, overrides):
        for key, value in overrides.items():
            if isinstance(value, dict) and key in source and isinstance(source[key], dict):
                deep_update(source[key], value)
            else:
                source[key] = value
        return source

    deep_update(data, updates)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

en_updates = {
    "masterData": {
        "common": {
            "home": "Home",
            "category_classification_details": "Category classification details",
            "registry_status": "Registry Status",
            "bilingual_record": "Bilingual classification record",
            "required": "Required",
            "scope": "Scope",
            "global": "Global",
            "status": "Status",
            "active": "Active",
            "compliance": "Compliance",
            "precision": "Precision",
            "currency_id": "Currency",
            "identification_naming": "Currency identification and naming",
            "base_currency_warning": "Warning: Setting this as base currency will affect all exchange rate calculations.",
            "base_currency_description": "The system uses the base currency for all internal calculations and reporting."
        },
        "uom": {
            "precision_description": "Standard metrics for inventory precision and conversion accuracy across all supply chain nodes."
        },
        "barcodes": {
            "title": "Barcodes",
            "mapping_section": "Mapping Section",
            "mapping_description": "Operational SKU linkage and quantity defaults",
            "item": "Target Item",
            "default_qty": "Default Stock-In Quantity",
            "hardware_integration": "Hardware Integration",
            "scan_description": "Real-time physical acquisition via scanning protocol",
            "barcode_label": "Primary Barcode Identity",
            "scan_or_type": "Initiate Scan or Type...",
            "current_identity": "Current Identity",
            "tip_1": "Ensure barcode clarity for consistent scanning.",
            "tip_2": "Default quantity will pre-fill during receipt."
        }
    }
}

ar_updates = {
    "masterData": {
        "common": {
            "home": "الرئيسية",
            "category_classification_details": "تفاصيل تصنيف الفئة",
            "registry_status": "حالة السجل",
            "bilingual_record": "سجل تصنيف ثنائي اللغة",
            "required": "مطلوب",
            "scope": "النطاق",
            "global": "عام",
            "status": "الحالة",
            "active": "نشط",
            "compliance": "الامتثال",
            "precision": "الدقة",
            "currency_id": "العملة",
            "identification_naming": "تعريف وتسمية العملة",
            "base_currency_warning": "تحذير: تعيين هذه كعملة أساسية سيؤثر على جميع حسابات أسعار الصرف.",
            "base_currency_description": "يستخدم النظام العملة الأساسية لجميع الحسابات الداخلية والتقارير."
        },
        "uom": {
            "precision_description": "مقاييس قياسية لدقة المخزون ودقة التحويل عبر جميع نقاط سلسلة التوريد."
        },
        "barcodes": {
            "title": "الباركود",
            "mapping_section": "قسم الربط",
            "mapping_description": "ربط SKU التشغيلي والكميات الافتراضية",
            "item": "الصنف المستهدف",
            "default_qty": "الكمية الافتراضية عند الإدخال",
            "hardware_integration": "تكامل الأجهزة",
            "scan_description": "الاستحواذ المادي في الوقت الفعلي عبر بروتوكول المسح",
            "barcode_label": "هوية الباركود الأساسية",
            "scan_or_type": "ابدأ المسح أو اكتب...",
            "current_identity": "الهوية الحالية",
            "tip_1": "تأكد من وضوح الباركود لضمان اتساق المسح.",
            "tip_2": "سيتم ملء الكمية الافتراضية مسبقاً أثناء الاستلام."
        }
    }
}

update_json('messages/en.json', en_updates)
update_json('messages/ar.json', ar_updates)
print("Translations updated successfully.")
