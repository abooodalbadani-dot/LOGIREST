import os
import glob

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
    'sm:max-w-md flex-1 shrink-0',
    'sm:max-w-xl md:max-w-2xl flex-1 shrink-0'
)

# Update all ListClient.tsx files
search_dir = r'c:\kitchen-store-inventory-system\apps\web\src\app'
for root, _, files in os.walk(search_dir):
    for file in files:
        if file.endswith('ListClient.tsx') or file.endswith('MappingClient.tsx') or file == 'PRListClient.tsx':
            filepath = os.path.join(root, file)
            # Replace the wrapper div class
            replace_in_file(filepath, 'w-full sm:max-w-sm shrink-0 group', 'w-full sm:max-w-lg md:max-w-xl shrink-0 flex-1 group')
            replace_in_file(filepath, 'w-full sm:max-w-sm shrink-0', 'w-full sm:max-w-lg md:max-w-xl shrink-0 flex-1')
            
            # For PRListClient which might have different input structure
            replace_in_file(filepath, 'w-full sm:max-w-sm', 'w-full sm:max-w-lg md:max-w-xl')

print("Width update complete.")
