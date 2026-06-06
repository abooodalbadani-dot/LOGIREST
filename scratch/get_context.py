import json

en_path = r"e:\kitchen-store-inventory-system\apps\web\messages\en.json"
untranslated_keys = [
    "common.document_locked", "common.document_status", "common.read_only_mode", "common.back_to_list", "common.locales.en",
    "masterData.common.placeholder_sku", "notifications.subject_en", "notifications.body_en",
    "admin.restaurant_profile.placeholders.email", "operational.inventory.export", "operational.inventory.total_sku",
    "operational.inventory.filter_category", "operational.inventory.filter_all", "operational.inventory.filter_status",
    "operational.inventory.pagination_info", "operational.inventory.quick_actions", "operational.inventory.barcode_scanner",
    "operational.inventory.print_labels", "operational.inventory.reconciliation", "operational.inventory.empty_title",
    "operational.inventory.empty_description", "operational.po.filter_status", "operational.po.filter_supplier",
    "operational.po.all_suppliers", "operational.po.filter_date", "operational.po.clear_filters", "operational.po.pagination_info",
    "operational.po.active_orders", "operational.po.monthly_expenditure", "operational.po.active_vendors",
    "operational.po.bulk_edit", "operational.po.table.order_no", "operational.po.status.sent", "operational.lots.lot_tag",
    "operational.lots.status_valid", "operational.lots.expiry_label", "operational.lots.available_balance",
    "operational.lots.units", "operational.lots.total_entry", "operational.lots.total_exit", "operational.lots.storage_node",
    "operational.lots.last_activity", "operational.lots.export_ledger", "operational.lots.relocate",
    "operational.lots.print_label", "operational.lots.adjust", "operational.lots.table.datetime",
    "operational.lots.table.entry", "operational.lots.table.exit", "operational.search.identified_matches",
    "operational.search.search_hint", "operational.search.shortcut_hint", "operational.search.placeholder",
    "operational.search.execute", "operational.search.refine", "operational.search.main_category",
    "operational.search.recent_searches", "operational.search.syncing", "operational.search.records",
    "operational.search.no_matches", "operational.search.no_matches_desc", "operational.search.tips.sku_desc",
    "operational.search.tips.transactions_desc"
]

with open(en_path, 'r', encoding='utf-8') as f:
    en_data = json.load(f)

def get_val(data, path):
    keys = path.split('.')
    val = data
    for k in keys:
        val = val.get(k, {})
    return val

print("Context from en.json:")
for key in untranslated_keys:
    val = get_val(en_data, key)
    print(f"{key}: {val}")
