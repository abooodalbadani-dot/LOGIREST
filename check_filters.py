import os, re
app_dir = r'c:\kitchen-store-inventory-system\apps\web\src\app'
for root, dirs, files in os.walk(app_dir):
    for f in files:
        if f.endswith('ListClient.tsx') or f.endswith('Client.tsx'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
                # Find filters={...} block
                m = re.search(r'filters=\{\s*<div className=\"([^\"]+)\"', content)
                if m:
                    print(f'{f}: {m.group(1)}')
