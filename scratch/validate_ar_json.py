import json
try:
    with open('apps/web/messages/ar.json', 'r', encoding='utf-8') as f:
        json.load(f)
    print("Valid JSON")
except Exception as e:
    print(f"Invalid JSON: {e}")
