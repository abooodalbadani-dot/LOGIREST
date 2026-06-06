import json

try:
    with open(r'e:\kitchen-store-inventory-system\apps\web\messages\ar.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    print("JSON is valid")
    if "landed_cost" in data:
        print("landed_cost found")
        print(data["landed_cost"])
    else:
        print("landed_cost NOT found")
except Exception as e:
    print(f"Error: {e}")
