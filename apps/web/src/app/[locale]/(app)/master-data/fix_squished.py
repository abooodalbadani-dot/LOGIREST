import os
import glob
import re

form_files = [
    "apps/web/src/app/[locale]/(app)/admin/restaurant-profile/ProfileFormClient.tsx",
    "apps/web/src/app/[locale]/(app)/master-data/barcodes/BarcodeFormClient.tsx",
    "apps/web/src/app/[locale]/(app)/master-data/branches/BranchFormClient.tsx",
    "apps/web/src/app/[locale]/(app)/master-data/currencies/CurrencyFormClient.tsx",
    "apps/web/src/app/[locale]/(app)/master-data/departments/DepartmentFormClient.tsx",
    "apps/web/src/app/[locale]/(app)/master-data/fx-rates/FXRateFormClient.tsx",
    "apps/web/src/app/[locale]/(app)/master-data/items/ItemFormClient.tsx",
    "apps/web/src/app/[locale]/(app)/master-data/suppliers/SupplierFormClient.tsx",
    "apps/web/src/app/[locale]/(app)/master-data/warehouses/WarehouseFormClient.tsx"
]

def fix_squished_layouts():
    for filepath in form_files:
        if not os.path.exists(filepath):
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # 1. Replace the main column (was lg:col-span-2)
        content = re.sub(r'className="lg:col-span-2\s+space-y-8"', 'className="col-span-1 md:col-span-8 space-y-8 w-full"', content)
        content = re.sub(r'className="lg:col-span-2\s+space-y-6"', 'className="col-span-1 md:col-span-8 space-y-6 w-full"', content)

        # 2. Replace the sidebar column
        # The sidebar column is typically `<div className="space-y-8">` right after the main column's closing div.
        # This is harder to regex safely without breaking inner space-y-8s.
        # But wait! If we look for `</div>\n\n          <div className="space-y-8">` we can target it.
        # Let's replace any `div className="space-y-8"` that follows `          <div ` (indentation level 10)
        # Or we can just use regex substitution with a callback tracking indentation.
        
        lines = content.split('\n')
        for i, line in enumerate(lines):
            # If the line is EXACTLY `<div className="space-y-8">` with 10 spaces of indentation (or similar)
            # representing the sidebar column directly under the 12-col grid
            if re.match(r'^\s*<div className="space-y-[68]">$', line):
                # Check if it's the right indentation. Usually the grid wrapper is at 8 spaces, so its children are at 10 spaces.
                if len(line) - len(line.lstrip()) == 10:
                    lines[i] = line.replace('className="space-y-', 'className="col-span-1 md:col-span-4 space-y-').replace('">', ' w-full">')
        
        content = '\n'.join(lines)

        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed squished layout in {os.path.basename(filepath)}")

fix_squished_layouts()
