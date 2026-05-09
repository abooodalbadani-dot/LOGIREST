import json

def find_placeholders(ar_path, en_path):
    with open(ar_path, 'r', encoding='utf-8') as f:
        ar_data = json.load(f)
    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)

    placeholder = "طلبات المطبخ"
    results = []

    def walk(ar_node, en_node, path=""):
        if isinstance(ar_node, dict):
            for k, v in ar_node.items():
                new_path = f"{path}.{k}" if path else k
                en_v = en_node.get(k) if isinstance(en_node, dict) else None
                walk(v, en_v, new_path)
        elif isinstance(ar_node, str):
            if placeholder in ar_node:
                results.append({
                    "path": path,
                    "ar": ar_node,
                    "en": en_node
                })

    walk(ar_data, en_data)
    
    for r in results:
        print(f"Path: {r['path']}")
        print(f"  AR: {r['ar']}")
        print(f"  EN: {r['en']}")
        print("-" * 20)

find_placeholders('apps/web/messages/ar.json', 'apps/web/messages/en.json')
