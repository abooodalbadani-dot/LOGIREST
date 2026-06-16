import os
import re

directories = [
    'apps/web/src/app/[locale]/(app)',
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to replace the bulky filters block with the minimal one
    # Specifically looking for:
    # filters={
    #   <div className="flex flex-wrap items-end gap-6 w-full py-4 px-6 bg-white dark:bg-card-dark border...
    #     ...
    #     <Input ... onChange={(e) => setSearch(e.target.value)} ... />
    #     <Search ... />
    #   ...
    # }
    
    # Let's search for `filters={` and check if it has `bg-surface-container-highest` or `bg-white dark:bg-card-dark border border-gray-200 dark:border-neutral-800 shadow-sm/50`
    
    if 'filters={' in content and 'bg-white dark:bg-card-dark border' in content and 'flex-wrap' in content:
        # It's highly likely one of the bloated ones.
        print(f"Found bloated filter in {filepath}")
        
for d in directories:
    if os.path.exists(d):
        for root, dirs, files in os.walk(d):
            for file in files:
                if file.endswith('Client.tsx'):
                    process_file(os.path.join(root, file))
