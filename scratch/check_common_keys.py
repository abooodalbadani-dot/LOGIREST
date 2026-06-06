import json

with open(r"apps/web/messages/en.json", 'r', encoding='utf-8') as f:
    en = json.load(f)

with open(r"apps/web/messages/ar.json", 'r', encoding='utf-8') as f:
    ar = json.load(f)

common_en = en.get("common", {})
common_ar = ar.get("common", {})

required_keys = [
    "select_warehouse",
    "notes",
    "items",
    "not_found",
    "save",
    "completed",
    "error",
    "select_item",
    "create",
    "item",
    "uom",
    "no_items",
    "cancel",
    "saving"
]

print("=== Checking common namespace ===")
for key in required_keys:
    in_en = key in common_en
    in_ar = key in common_ar
    print(f"Key '{key}': EN={in_en}, AR={in_ar}")
    if not in_en or not in_ar:
        print(f"  --> MISSING in: {'EN' if not in_en else ''} {'AR' if not in_ar else ''}")
