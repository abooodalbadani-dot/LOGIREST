import json
import os

files = ['apps/web/messages/en.json', 'apps/web/messages/ar.json']

for f in files:
    if not os.path.exists(f):
        print(f"File {f} not found")
        continue
    
    with open(f, 'r', encoding='utf-8') as fh:
        data = json.load(fh)
    
    with open(f, 'w', encoding='utf-8') as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    print(f"Cleaned up {f}")
