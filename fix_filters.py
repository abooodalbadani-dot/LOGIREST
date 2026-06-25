import os, re
app_dir = r'c:\kitchen-store-inventory-system\apps\web\src\app'

pattern1 = r'filters=\{\s*<div className="relative w-full flex-1 shrink-0(?: group)? sm:max-w-xl lg:max-w-2xl">\s*(<Search[\s\S]*?/>)\s*(<Input[\s\S]*?/>)\s*</div>\s*\}'

replacement1 = r'''filters={
       <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
         <div className="w-full sm:max-w-md">
           <div className="relative w-full group">
             \1
             \2
           </div>
         </div>
       </div>
      }'''

pattern2 = r'filters=\{\s*<div className="relative w-full(?: group)?">\s*(<Search[\s\S]*?/>)\s*(<Input[\s\S]*?/>)\s*</div>\s*\}'

count = 0
for root, dirs, files in os.walk(app_dir):
    for f in files:
        if f.endswith('ListClient.tsx') or f.endswith('Client.tsx'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            new_content = re.sub(pattern1, replacement1, content)
            new_content = re.sub(pattern2, replacement1, new_content)
            
            if content != new_content:
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                count += 1
                print(f"Fixed {f}")
print(f"Total files fixed: {count}")
