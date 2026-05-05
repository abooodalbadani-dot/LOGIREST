
import json

def deep_merge(dict1, dict2):
    for key, value in dict2.items():
        if key in dict1 and isinstance(dict1[key], dict) and isinstance(value, dict):
            deep_merge(dict1[key], value)
        else:
            dict1[key] = value
    return dict1

def fix_and_sync_json():
    def merge_pairs(pairs):
        result = {}
        for k, v in pairs:
            if k in result:
                if isinstance(result[k], dict) and isinstance(v, dict):
                    deep_merge(result[k], v)
                else:
                    result[k] = v
            else:
                result[k] = v
        return result

    with open('messages/en.json', 'r', encoding='utf-8') as f:
        en = json.loads(f.read(), object_pairs_hook=merge_pairs)
    with open('messages/ar.json', 'r', encoding='utf-8') as f:
        ar = json.loads(f.read(), object_pairs_hook=merge_pairs)

    # Missing in AR translations
    ar_missing = {
        "offline": "جلسة التدقيق [أوفلاين]",
        "post_confirm_title": "تأكيد ترحيل الجرد",
        "snapshot_at": "تاريخ لقطة الرصيد",
        "items_count": "عدد الأصناف",
        "started_by": "بدأ بواسطة",
        "warehouse_locked_banner": "المستودع مقفل بجلسة جرد نشطة: {sessionNumber}",
        "items_to_audit": "أصناف للتدقيق",
        "post_session": "ترحيل الجلسة",
        "draft_status": "مسودة",
        "post_confirm_desc": "سيتم إنشاء مستندات تسوية لجميع الفروقات وسيتم رفع القفل عن المستودع.",
        "search_placeholder": "البحث في جلسات الجرد...",
        "session_number": "رقم الجلسة #",
        "no_items_in_manifest": "لا توجد أصناف في هذا البيان",
        "post_irreversible": "ترحيل التدقيق هو إجراء غير قابل للتراجع.",
        "variance_reason_required": "سبب الفرق مطلوب لأي فرق غير صفري.",
        "status": "الحالة",
        "uid": "المعرف",
        "retrieving_manifest": "مزامنة قاعدة التدقيق..."
    }

    # Missing in EN translations
    en_missing = {
        "summary_card": "Summary Card",
        "reject_title": "Reject Stocktake",
        "variance_value": "Variance Value",
        "approve_title": "Approve Stocktake"
    }

    st_en = en['operations']['stocktake']
    st_ar = ar['operations']['stocktake']

    # Sync keys from EN to AR
    for k, v in st_en.items():
        if k not in st_ar:
            st_ar[k] = ar_missing.get(k, v) # Fallback to EN value if no AR translation provided

    # Sync keys from AR to EN
    for k, v in st_ar.items():
        if k not in st_en:
            st_en[k] = en_missing.get(k, v)

    # Save back
    with open('messages/en.json', 'w', encoding='utf-8') as f:
        json.dump(en, f, ensure_ascii=False, indent=2)
    with open('messages/ar.json', 'w', encoding='utf-8') as f:
        json.dump(ar, f, ensure_ascii=False, indent=2)
    
    print("Fixed duplicates and synchronized stocktake keys.")

if __name__ == "__main__":
    fix_and_sync_json()
