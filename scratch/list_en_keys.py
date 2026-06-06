import json

with open(r"apps/web/messages/en.json", 'r', encoding='utf-8') as f:
    data = json.load(f)

print("Root level keys in en.json:")
for key in sorted(data.keys()):
    val = data[key]
    if isinstance(val, dict):
        print(f"  - {key}: {list(val.keys())[:10]}...")
    else:
        print(f"  - {key}: {type(val)}")
