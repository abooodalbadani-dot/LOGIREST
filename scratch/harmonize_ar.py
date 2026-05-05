import json
import os

# Extensive terminology mapping for a professional business-grade Arabic translation
TERM_MAP = {
    # Core Business Terms (per user request)
    "Purchase Request": "طلب شراء",
    "Purchase Requests": "طلبات شراء",
    "Purchase Order": "أمر شراء",
    "Purchase Orders": "أوامر شراء",
    "Goods Received Note": "إذن استلام",
    "Goods Received Notes": "أذونات استلام",
    "GRN": "إذن استلام",
    "GRNs": "أذونات استلام",
    "Stock Movement": "حركة مخزون",
    "Adjustment": "تسوية مخزون",
    "Adjustments": "تسويات مخزون",
    "Transfer": "تحويل مخزون",
    "Transfers": "تحويلات مخزون",
    "Stocktake": "جرد مخزون",
    "Stocktake Sessions": "جلسات جرد المخزون",
    "Ledger": "سجل الحركات",
    "FX Rate": "سعر الصرف",
    "FX Rates": "أسعار الصرف",
    "Unit of Measure": "وحدة قياس",
    "Units of Measure": "وحدات القياس",
    "Inventory": "المخزون",
    "Inventory Balance": "رصيد المخزون",
    "UoM": "وحدة قياس",
    "PR": "طلب شراء",
    "PO": "أمر شراء",

    # UI & Functional Terms
    "Dashboard": "لوحة القيادة",
    "Overview": "نظرة عامة",
    "Operations": "العمليات",
    "Management": "إدارة",
    "Supply Chain": "سلسلة التوريد",
    "Master Data": "البيانات الأساسية",
    "Registry": "سجل",
    "Configuration": "تكوين",
    "Settings": "الإعدادات",
    "Profile": "الملف الشخصي",
    "Reports": "التقارير",
    "Analytics": "التحليلات",
    "Administration": "الإدارة",
    "System": "النظام",
    "Notification": "تنبيه",
    "Notifications": "التنبيهات",
    "User": "مستخدم",
    "Users": "المستخدمين",
    "Role": "دور",
    "Roles": "الأدوار",
    "Audit Log": "سجل التدقيق",
    "Audit History": "تاريخ التدقيق",
    "Search": "بحث",
    "Filter": "تصفية",
    "Filters": "تصفية",
    "Code": "الرمز",
    "Item Code": "رمز الصنف",
    "Item Name": "اسم الصنف",
    "SKU": "رمز التخزين (SKU)",
    "Barcode": "باركود",
    "Quantity": "الكمية",
    "Qty": "الكمية",
    "Price": "السعر",
    "Cost": "التكلفة",
    "Unit Cost": "تكلفة الوحدة",
    "Total": "الإجمالي",
    "Subtotal": "الإجمالي الفرعي",
    "Amount": "المبلغ",
    "Currency": "العملة",
    "Date": "التاريخ",
    "Time": "الوقت",
    "Status": "الحالة",
    "Category": "الفئة",
    "Categories": "الفئات",
    "Supplier": "المورد",
    "Suppliers": "الموردون",
    "Warehouse": "المستودع",
    "Warehouses": "المستودعات",
    "Branch": "الفرع",
    "Branches": "الفروع",
    "Location": "الموقع",
    "Locations": "المواقع",
    "Document": "مستند",
    "Document No": "رقم المستند",
    "Reference": "المرجع",
    "Remarks": "ملاحظات",
    "Notes": "ملاحظات",
    "Save": "حفظ",
    "Create": "إنشاء",
    "Edit": "تعديل",
    "Delete": "حذف",
    "View": "عرض",
    "Print": "طباعة",
    "Cancel": "إلغاء",
    "Confirm": "تأكيد",
    "Submit": "إرسال",
    "Approve": "اعتماد",
    "Reject": "رفض",
    "Post": "ترحيل",
    "Sync": "مزامنة",
    "Import": "استيراد",
    "Export": "تصدير",
    "Success": "نجاح",
    "Error": "خطأ",
    "Warning": "تحذير",
    "Loading": "جاري التحميل",
    "Saving": "جاري الحفظ",
    "Draft": "مسودة",
    "Pending": "قيد الانتظار",
    "Approved": "معتمد",
    "Rejected": "مرفوض",
    "Posted": "مرحل",
    "Completed": "مكتمل",
    "Cancelled": "ملغي",
    "Fulfilled": "منجز",
    "Partial": "جزئي",
    "In Transit": "في الطريق",
    "Open": "مفتوح",
    "Active": "نشط",
    "Inactive": "غير نشط",
    "Started": "بدأ",
    "Yes": "نعم",
    "No": "لا",
    "SAR": "ر.س",
    "USD": "دولار",
    "Saudi Riyal": "ريال سعودي",
    "US Dollar": "دولار أمريكي",
    "Food & Ingredients": "الأغذية والمكونات",
    "Equipment": "المعدات",
    "Packaging": "التعبئة والتغليف",
    "Supplies": "المستلزمات",
    "Each (EA)": "قطعة",
    "Kilogram (KG)": "كيلوجرام",
    "Liter (L)": "لتر"
}

def harmonize():
    en_path = 'messages/en.json'
    recovered_path = 'messages/ar_recovered.json'
    output_path = 'messages/ar.json'

    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)

    ar_flat = {}
    if os.path.exists(recovered_path):
        with open(recovered_path, 'r', encoding='utf-8') as f:
            ar_flat = json.load(f)

    def build_harmonized(en_obj, current_path=""):
        if isinstance(en_obj, dict):
            new_obj = {}
            for k, v in en_obj.items():
                new_path = f"{current_path}.{k}" if current_path else k
                new_obj[k] = build_harmonized(v, new_path)
            return new_obj
        else:
            en_val = str(en_obj).strip()
            leaf_key = current_path.split('.')[-1]
            
            # Start with recovered Arabic value if exists (match by leaf key)
            ar_val = ar_flat.get(leaf_key, en_val)
            
            # Apply Terminology Standardization (Case-insensitive matching)
            for eng_term, ar_term in TERM_MAP.items():
                if eng_term.lower() == en_val.lower():
                    ar_val = ar_term
                    break
            
            # Hard overrides for acronyms and specific placeholders
            if en_val == "PR": ar_val = "طلب شراء"
            if en_val == "PO": ar_val = "أمر شراء"
            if en_val == "GRN": ar_val = "إذن استلام"
            if en_val == "SAR": ar_val = "ر.س"
            
            # Path-based overrides for critical headings
            path_overrides = {
                "common.sidebar.pr": "طلبات الشراء",
                "common.sidebar.po": "أوامر الشراء",
                "common.sidebar.grn": "إذونات الاستلام",
                "common.sidebar.stocktake": "جرد المخزون",
                "common.sidebar.adjustment": "تسويات المخزون",
                "common.sidebar.transfer": "تحويلات المخزون",
                "common.sidebar.issue": "صرف المخزون",
                "common.sidebar.inventory": "إدارة المخزون",
                "procurement.pr.title": "طلبات الشراء",
                "procurement.po.title": "أوامر الشراء",
                "procurement.grn.title": "أذونات استلام البضائع",
                "operations.stocktake.title": "جلسات جرد المخزون",
                "operations.adjustment.title": "تسويات المخزون",
                "operations.transfer.title": "حركات تحويل المخزون",
                "operations.issue.title": "سندات صرف المخزون",
                "master_data.common.title": "البيانات الأساسية"
            }
            
            if current_path in path_overrides:
                ar_val = path_overrides[current_path]

            return ar_val

    ar_harmonized = build_harmonized(en_data)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(ar_harmonized, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully harmonized {output_path}")

if __name__ == "__main__":
    harmonize()
