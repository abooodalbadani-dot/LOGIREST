import os

def replace_in_file(filepath, old_str, new_str):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if old_str in content:
        content = content.replace(old_str, new_str)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

# Update DataTable.tsx wrapper
replace_in_file(
    r'c:\kitchen-store-inventory-system\apps\web\src\components\shared\DataTable\DataTable.tsx',
    'lg:max-w-2xl xl:max-w-4xl',
    'sm:max-w-lg lg:max-w-xl'
)

# Update all ListClient.tsx files
search_dir = r'c:\kitchen-store-inventory-system\apps\web\src\app'
for root, _, files in os.walk(search_dir):
    for file in files:
        if file.endswith('ListClient.tsx') or file.endswith('MappingClient.tsx') or file == 'PRListClient.tsx':
            filepath = os.path.join(root, file)
            # Replace the wrapper div class
            replace_in_file(filepath, 'lg:max-w-2xl xl:max-w-4xl', 'sm:max-w-md lg:max-w-lg')

print("Width update customized to md/lg complete.")
