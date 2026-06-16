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

def fix_squished_sidebars():
    for filepath in form_files:
        if not os.path.exists(filepath):
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # 1. Expand tiny fields that mistakenly got md:col-span-2
        # Usually fields for names or codes shouldn't be squeezed into 2/12. Let's upgrade them to 6 or 12.
        # But maybe we just leave it for now, except for the explicit `space-y-8` containers.
        
        # 2. Fix the sidebar wrapper. 
        # We need to replace exactly `<div className="space-y-8">` or `<div className="space-y-6">`
        # when they appear as direct children of the 12-column grid.
        
        # A simple hack: replace any `<div className="space-y-8">` with `<div className="col-span-1 md:col-span-4 space-y-8 w-full">`
        # BUT only if it is NOT already replaced, and only the ones that act as the sidebar container.
        # Usually they appear right after the end of the main 8-column div.
        
        # Let's do a regex substitution using indentation.
        def replacer(match):
            indent = match.group(1)
            cls_name = match.group(2) # e.g. "space-y-8"
            # If the indentation is exactly 8 spaces (or whatever the grid's child indentation is)
            if len(indent) == 8:
                return f'{indent}<div className="col-span-1 md:col-span-4 {cls_name} w-full">'
            return match.group(0) # unchanged

        content = re.sub(r'^(\s*)<div className="(space-y-[68])">', replacer, content, flags=re.MULTILINE)
        
        # Let's also check for tiny inner grids like col-span-2 that are too small.
        # The warehouse form name field was `col-span-1 md:col-span-2 w-full` inside a 12-col grid (16.6% width).
        content = re.sub(r'className="col-span-1 md:col-span-2 w-full"', 'className="col-span-1 md:col-span-12 w-full"', content)

        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed sidebar in {os.path.basename(filepath)}")

fix_squished_sidebars()
