import json

def merge_json(en_data, ar_data):
    result = {}
    for key, value in en_data.items():
        if isinstance(value, dict):
            # Recursively merge dicts
            ar_value = ar_data.get(key, {})
            if not isinstance(ar_value, dict):
                ar_value = {}
            result[key] = merge_json(value, ar_value)
        else:
            # For leaf nodes, use Arabic if it exists, else use English (as placeholder)
            result[key] = ar_data.get(key, value)
    return result

with open('messages/en.json', 'r', encoding='utf-8') as f:
    en = json.load(f)

with open('messages/ar.json', 'r', encoding='utf-8') as f:
    ar = json.load(f)

# Master Data Translations (New)
master_data_ar = {
    "common": {
        "code": "الكود",
        "name": "الاسم",
        "name_ar": "الاسم (بالعربية)",
        "name_en": "الاسم (بالإنجليزية)",
        "is_active": "نشط",
        "save": "حفظ",
        "saving": "جاري الحفظ...",
        "create_new": "إنشاء جديد",
        "edit": "تعديل",
        "view": "عرض",
        "search": "بحث",
        "cancel": "إلغاء",
        "saved_success": "تم الحفظ بنجاح.",
        "active": "نشط",
        "inactive": "غير نشط",
        "yes": "نعم",
        "no": "لا",
        "total_warehouses": "إجمالي المستودعات",
        "total_suppliers": "إجمالي الموردين",
        "total_skus": "إجمالي الـ SKUs",
        "active_partners": "الشركاء النشطون",
        "home": "الرئيسية",
        "master_data": "مركز البيانات الأساسية",
        "compliance_rate": "معدل الامتثال",
        "not_set": "غير محدد",
        "status": "الحالة",
        "basic_info": "المعلومات الأساسية",
        "basic_info_desc": "التعريف العام وتسمية هذا السجل.",
        "operational_details": "التفاصيل التشغيلية",
        "operational_details_desc": "تكوين الإدارة ودورة الحياة.",
        "status_description": "التحكم في الرؤية والتوافر التشغيلي لهذه الوحدة.",
        "active_status": "حالة النشاط",
        "inactive_status": "حالة عدم النشاط",
        "registry_status": "حالة السجل",
        "bilingual_record": "سجل التصنيف ثنائي اللغة",
        "required": "مطلوب",
        "scope": "النطاق",
        "global": "عالمي",
        "manager": "المدير",
        "cost_center": "مركز التكلفة",
        "registry_sync": "مزامنة السجل",
        "compliance": "الامتثال",
        "precision": "الدقة",
        "quick_tips": "نصائح سريعة",
        "branches": "الفروع",
        "warehouses": "المستودعات",
        "departments": "الأقسام",
        "suppliers": "الموردون",
        "categories": "الفئات",
        "items": "الأصناف",
        "uom": "وحدات القياس",
        "barcodes": "الباركود",
        "currencies": "العملات"
    },
    "branches": {
        "title": "الفروع",
        "description": "إدارة المواقع المادية والعقد التشغيلية.",
        "create_title": "فرع جديد",
        "edit_title": "تعديل فرع",
        "created_at": "تاريخ الإنشاء",
        "total_locations": "إجمالي المواقع",
        "active_status": "حالة النشاط",
        "operational_compliance": "الامتثال التشغيلي",
        "search_placeholder": "تصفية المواقع حسب الاسم أو الكود..."
    },
    "warehouses": {
        "title": "المستودعات",
        "description": "عقد المخزون المادية والافتراضية عبر شبكة التوريد العالمية.",
        "create_title": "مستودع جديد",
        "edit_title": "تعديل مستودع",
        "branch": "الفرع",
        "type": "النوع",
        "code": "كود المستودع",
        "parent_branch": "الفرع الأم",
        "name_en": "الاسم (EN)",
        "name_ar": "الاسم (AR)",
        "warehouse_type": "نوع المستودع",
        "status": "حالة المستودع",
        "select_branch": "اختر الفرع",
        "select_type": "اختر النوع",
        "select_status": "اختر الحالة",
        "actions": {
            "create": "إنشاء مستودع",
            "save": "حفظ التغييرات"
        },
        "type_main": "مستودع رئيسي",
        "type_dry": "مخزن جاف",
        "type_cold": "سلسلة تبريد",
        "type_virtual": "افتراضي / ترانزيت",
        "physical_sites": "المواقع المادية",
        "search_placeholder": "البحث في المستودعات حسب الاسم أو الكود...",
        "types": {
            "main": "مركز توزيع رئيسي",
            "dry": "تخزين جاف",
            "cold": "منشأة تبريد",
            "virtual": "عقدة افتراضية"
        }
    },
    "items": {
        "title": "الأصناف",
        "create_title": "صنف جديد",
        "edit_title": "تعديل صنف",
        "barcode": "باركود",
        "category": "الفئة",
        "classification": "التصنيف",
        "primary_uom": "وحدة القياس الأساسية",
        "track_lots": "تتبع الدفعات / الانتهاء",
        "min_stock_level": "أدنى مستوى مخزون",
        "reorder_point": "نقطة إعادة الطلب",
        "uom_conversions": "تحويلات وحدات القياس",
        "from_uom": "من وحدة",
        "to_uom": "إلى وحدة",
        "factor": "المعامل",
        "add_conversion": "إضافة تحويل",
        "add_conversion_logic": "إضافة منطق التحويل",
        "scan_or_type": "امسح أو اكتب الباركود...",
        "basic_info": "المعلومات الأساسية",
        "inventory_rules": "قواعد المخزون",
        "stock_thresholds": "عتبات المخزون",
        "no_conversions_defined": "لا توجد تحويلات معرفة"
    },
    "suppliers": {
        "title": "الموردون",
        "create_title": "مورد جديد",
        "edit_title": "تعديل مورد",
        "currency": "العملة الافتراضية",
        "payment_terms": "شروط الدفع",
        "description": "إدارة شركاء التوريد والاتفاقيات المالية.",
        "partner_identity": "هوية الشريك",
        "financial_terms": "الشروط المالية",
        "operational_settings": "الإعدادات التشغيلية",
        "code": "كود المورد",
        "status": "الحالة",
        "name_en": "الاسم (إنجليزي)",
        "name_ar": "الاسم (عربي)",
        "contact_info": "معلومات الاتصال",
        "contact_person": "الشخص المسؤول",
        "phone": "رقم الهاتف",
        "email": "البريد الإلكتروني",
        "tax_number": "الرقم الضريبي",
        "search_placeholder": "البحث في الموردين حسب الاسم أو الكود...",
        "terms_placeholder": "مثال: صافي 30 يومًا",
        "actions": {
            "create": "إنشاء مورد",
            "save": "حفظ التغييرات"
        }
    },
    "currencies": {
        "title": "العملات",
        "create_title": "عملة جديدة",
        "edit_title": "تعديل عملة",
        "description": "إدارة العملات وأسعار الصرف للنظام العالمي.",
        "search_placeholder": "البحث في العملات...",
        "symbol": "الرمز",
        "is_base": "العملة الأساسية",
        "fx_rates_title": "أسعار الصرف",
        "add_rate": "إضافة سعر",
        "from_currency": "من عملة",
        "to_currency": "إلى عملة",
        "rate": "السعر",
        "effective_date": "تاريخ السريان",
        "rate_immutable_note": "لا يمكن تعديل أسعار الصرف بعد الإنشاء.",
        "total_currencies": "إجمالي العملات",
        "base_units": "الوحدات الأساسية",
        "global_reach": "الانتشار العالمي",
        "base_currency": "العملة الأساسية",
        "base_active": "الأساسية نشطة",
        "base_inactive": "الأساسية غير نشطة"
    },
    "departments": {
        "title": "الأقسام",
        "create_title": "قسم جديد",
        "edit_title": "تعديل قسم",
        "description": "إدارة الأقسام والكيانات التنظيمية.",
        "search_placeholder": "تصفية الأقسام حسب الاسم أو الكود...",
        "branch": "الفرع",
        "total_units": "إجمالي الوحدات",
        "active_capacity": "السعة النشطة",
        "structural_audit": "التدقيق الهيكلي",
        "basic_info": "المعلومات الأساسية",
        "operational_details": "التفاصيل التشغيلية"
    },
    "uom": {
        "title": "وحدات القياس",
        "create_title": "وحدة جديدة",
        "edit_title": "تعديل وحدة",
        "description": "مقاييس التكميم الموحدة لدقة المخزون والتحويل.",
        "search_placeholder": "تصفية الوحدات حسب الاسم أو الكود...",
        "total_metrics": "إجمالي المقاييس",
        "precision": "الدقة",
        "registry_sync": "مزامنة السجل"
    },
    "categories": {
        "title": "الفئات",
        "create_title": "فئة جديدة",
        "edit_title": "تعديل فئة",
        "description": "تصنيف الأصناف لأغراض التقارير والتحليل.",
        "search_placeholder": "تصفية الفئات حسب الاسم أو الكود...",
        "total_groups": "إجمالي المجموعات",
        "hierarchy_depth": "عمق التسلسل الهرمي",
        "mapping_status": "حالة الربط",
        "layers": "الطبقات",
        "category_mapping": "ربط الفئات"
    },
    "barcodes": {
        "title": "الباركود",
        "create_title": "باركود جديد",
        "edit_title": "تعديل باركود",
        "description": "سجل الباركود وربط الأصناف.",
        "search_placeholder": "البحث في الباركود...",
        "item": "الصنف",
        "barcode": "الباركود",
        "barcode_label": "الباركود",
        "default_qty": "الكمية الافتراضية",
        "scan_or_type": "امسح أو اكتب الباركود...",
        "total_identities": "إجمالي الهويات",
        "linked_assets": "الأصول المرتبطة",
        "active_mappings": "الارتباطات النشطة",
        "sku_link_verified": "تم التحقق من رابط SKU"
    },
    "import": {
        "title": "استيراد جماعي",
        "step_upload": "تحميل",
        "step_validate": "تحقق",
        "step_review": "مراجعة",
        "step_commit": "تنفيذ",
        "select_file": "اختر ملف CSV/Excel",
        "upload_cta": "تحميل وتحقق",
        "validation_success": "نجح التحقق. {count} سجل جاهز.",
        "validation_error": "فشل التحقق. تم العثور على {count} أخطاء.",
        "import_now": "استيراد الآن",
        "import_success": "تم استيراد {count} سجل بنجاح."
    }
}

# Add masterData to existing Arabic data if missing or update it
ar['masterData'] = master_data_ar

# Also handle operational, search, item_form, purchasing which might be missing in original ar.json
operational_ar = {
    "inventory": {
        "title": "نظرة عامة على المخزون",
        "subtitle": "تنسيق سلاسل التوريد متعددة العقد ومستويات المخزون",
        "search_placeholder": "استعلام عن الأصناف أو SKU...",
        "add_item": "صنف جديد",
        "export": "تصدير البيانات",
        "total_value": "إجمالي قيمة المخزون",
        "near_expiry": "قريب الانتهاء",
        "low_stock": "أصناف منخفضة المخزون",
        "total_sku": "إجمالي عمق SKU",
        "filter_category": "الفئة",
        "filter_all": "الكل",
        "filter_status": "حالة المخزون",
        "pagination_info": "عرض {start}-{end} من {total}",
        "quick_actions": "إجراءات سريعة:",
        "barcode_scanner": "ماسح الباركود",
        "print_labels": "طباعة الملصقات",
        "reconciliation": "تسوية الكمية",
        "status": {
            "critical": "حرج",
            "low": "منخفض",
            "healthy": "سليم"
        }
    },
    "po": {
        "title": "سجل أوامر الشراء",
        "subtitle": "تنسيق المشتريات ومراقبة سلسلة التوريد",
        "create_new": "إنشاء أمر شراء جديد",
        "filter_status": "حالة أمر الشراء",
        "filter_supplier": "المورد",
        "all_suppliers": "كل الموردين",
        "filter_date": "تاريخ أمر الشراء",
        "select_date": "اختر التاريخ",
        "clear_filters": "مسح الفلاتر",
        "pagination_info": "عرض {start}-{end} من {total} أوامر شراء",
        "active_orders": "الأوامر النشطة",
        "monthly_expenditure": "الإنفاق الشهري",
        "active_vendors": "الموردون النشطون",
        "bulk_edit": "تعديل جماعي",
        "table": {
            "order_no": "رقم الطلب #",
            "date": "التاريخ",
            "total": "الإجمالي",
            "currency": "العملة"
        },
        "status": {
            "completed": "مكتمل",
            "partial": "جزئي",
            "sent": "مرسل",
            "draft": "مسودة"
        }
    },
    "lots": {
        "title": "دفتر معاملات الدفعة",
        "subtitle": "تتبع تاريخي لجميع الحركات لهذه الدفعة",
        "lot_tag": "دفعة",
        "status_valid": "صالح",
        "expiry_label": "الانتهاء: {date}",
        "available_balance": "الرصيد المتاح",
        "units": "وحدات",
        "total_entry": "إجمالي الوارد",
        "total_exit": "إجمالي الصادر",
        "storage_node": "نقطة التخزين",
        "last_activity": "آخر نشاط",
        "export_ledger": "تصدير الدفتر بالكامل",
        "relocate": "نقل",
        "print_label": "طباعة الملصق",
        "adjust": "تعديل",
        "table": {
            "datetime": "التاريخ والوقت",
            "type": "النوع",
            "entry": "وارد",
            "exit": "صادر",
            "qty": "الكمية",
            "balance": "الرصيد الجاري",
            "reference": "المرجع",
            "user": "المستخدم"
        }
    },
    "search": {
        "title": "البحث الشامل",
        "identified_matches": "تم العثور على {count} مطابقة لـ \"{query}\"",
        "search_hint": "البحث في الأصناف، الموردين، أو المستندات",
        "shortcut_hint": "اضغط / للبحث السريع",
        "placeholder": "ابحث عن صنف، مورد، أو رقم فاتورة...",
        "execute": "تنفيذ البحث",
        "refine": "تحسين النتائج",
        "main_category": "الفئة الرئيسية",
        "operational_status": "الحالة التشغيلية",
        "recent_searches": "عمليات البحث الأخيرة",
        "syncing": "جاري مزامنة قواعد البيانات التشغيلية...",
        "records": "السجلات",
        "no_matches": "لا توجد مطابقة",
        "no_matches_desc": "لم يتم العثور على أي مطابقة تشغيلية لـ \"{query}\" في المصفوفة الرئيسية.",
        "reset": "إعادة ضبط البروتوكول",
        "tips": {
            "sku": "تتبع SKU",
            "sku_desc": "العثور على البيانات الأساسية عبر SKU أو أسماء الأصناف",
            "transactions": "المعاملات",
            "transactions_desc": "الوصول إلى أوامر الشراء والفواتير والتحويلات الداخلية",
            "suppliers": "الموردون",
            "suppliers_desc": "تفاصيل الموردين وجهات الاتصال والأداء"
        },
        "sections": {
            "products": "المنتجات",
            "suppliers": "الموردون",
            "warehouse": "المستودع",
            "transactions": "المعاملات"
        }
    },
    "item_form": {
        "steps": {
            "basic": "المعلومات الأساسية",
            "uom": "وحدات القياس",
            "alerts": "تنبيهات المخزون"
        },
        "image": {
            "label": "صورة الصنف",
            "upload_hint": "انقر للتحميل",
            "resolution": "الدقة الموصى بها: 800x800"
        },
        "glance": {
            "title": "نظرة سريعة",
            "sku": "كود SKU",
            "category": "الفئة"
        },
        "header": {
            "title": "إضافة صنف جديد",
            "subtitle": "يرجى إكمال جميع الخطوات لدقة البيانات"
        },
        "fields": {
            "sku": "رقم SKU",
            "category": "الفئة",
            "name_ar": "اسم الصنف (بالعربية)",
            "name_en": "اسم الصنف (بالإنجليزية)",
            "base_unit": "الوحدة الأساسية",
            "conversions": "عوامل التحويل",
            "add_conversion": "إضافة تحويل",
            "no_conversions": "لم يتم إضافة عوامل تحويل بعد",
            "min_stock": "الحد الأدنى للمخزون",
            "alert_threshold": "عتبة التنبيه",
            "notifications": "تنبيهات النظام",
            "notifications_desc": "سيتم إرسال تنبيه فوري إلى مدير المتجر عندما يصل المخزون إلى العتبة المحددة."
        },
        "actions": {
            "previous": "السابق",
            "saving": "جاري الحفظ...",
            "save": "حفظ الصنف",
            "next": "الخطوة التالية"
        },
        "validation": {
            "sku_min": "يجب أن يكون رمز الصنف حرفين على الأقل",
            "name_en_required": "الاسم الإنجليزي مطلوب",
            "name_ar_required": "الاسم العربي مطلوب",
            "min_stock_negative": "لا يمكن أن يكون القيمة سالبة"
        }
    }
}

purchasing_ar = {
    "po": {
        "title": "تفاصيل أمر الشراء",
        "supplier": "المورد",
        "linked_pr": "طلب شراء مرتبط (اختياري)",
        "expected_date": "تاريخ التسليم المتوقع",
        "supplier_currency": "عملة المورد",
        "fx_rate": "سعر الصرف (إلى ريال سعودي)",
        "general_notes": "ملاحظات عامة",
        "line_items": "الأصناف المطلوبة",
        "add_item": "إضافة صنف",
        "item_sku": "رمز الصنف",
        "quantity": "الكمية",
        "unit_price": "سعر الوحدة",
        "line_notes": "ملاحظات البند",
        "supplier_total": "إجمالي المورد",
        "base_total": "الإجمالي بالعملة الأساسية",
        "select_supplier": "اختر المورد",
        "notes_placeholder": "مثال: مطلوب تغليف خاص",
        "actions": {
            "submit": "إرسال أمر الشراء",
            "submitting": "جاري الإرسال..."
        }
    }
}

ar['operational'] = operational_ar
ar['purchasing'] = purchasing_ar

# Final merge with EN to ensure no missing keys
final_ar = merge_json(en, ar)

with open('messages/ar.json', 'w', encoding='utf-8') as f:
    json.dump(final_ar, f, ensure_ascii=False, indent=2)
