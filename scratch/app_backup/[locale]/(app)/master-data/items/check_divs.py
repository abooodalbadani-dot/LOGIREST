import re

file_path = r"e:/Kitchen‑Store Inventory System/apps/web/src/app/[locale]/(app)/master-data/items/ItemFormClient.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

div_count = 0
for i, line in enumerate(lines):
    open_divs = len(re.findall(r'<div\b', line))
    close_divs = len(re.findall(r'</div\b', line))
    div_count += open_divs
    div_count -= close_divs
    if div_count < 0:
        print(f"Error: Extra </div> at line {i+1}: {line.strip()}")
        # Reset count to find more
        div_count = 0

print(f"Final div count: {div_count}")
