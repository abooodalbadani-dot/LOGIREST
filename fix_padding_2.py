import os, re
app_dir = r'c:\kitchen-store-inventory-system\apps\web\src\app'

count = 0
for root, dirs, files in os.walk(app_dir):
    for f in files:
        if f.endswith('ListClient.tsx') or f.endswith('Client.tsx'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            def replacer(m):
                classes = m.group(2)
                new_classes = ' '.join([c for c in classes.split() if not re.match(r'^(p-[0-9]|px-[0-9]|py-[0-9]|sm:p-[0-9]|md:p-[0-9]|lg:p-[0-9]|xl:p-[0-9]|2xl:p-[0-9])', c)])
                return m.group(1) + new_classes + m.group(3)
                
            new_content = re.sub(r'(<div\s+className=")([^"]*max-w-\[1600px\][^"]*)(")', replacer, content)
            
            if content != new_content:
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                count += 1
                print(f"Removed padding from {f}")
print(f"Total files fixed: {count}")
