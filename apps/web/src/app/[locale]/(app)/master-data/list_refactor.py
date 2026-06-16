import os
import re

base_dir = 'apps/web/src/app/[locale]/(app)/master-data'

files_to_refactor = []
for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith('Client.tsx'):
            files_to_refactor.append(os.path.join(root, file))

for f in files_to_refactor:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # 1. Page Wrapper Fix
    content = re.sub(
        r'className="p-8 max-w-\[1600px\] mx-auto space-y-10(.*)"',
        r'className="w-full max-w-full overflow-x-hidden p-4 sm:p-6 md:p-8 flex flex-col gap-6\1"',
        content
    )
    content = re.sub(
        r'className="p-8 space-y-10(.*)"',
        r'className="w-full max-w-full overflow-x-hidden p-4 sm:p-6 md:p-8 flex flex-col gap-6\1"',
        content
    )

    # 2. Metric Grid Fix
    content = re.sub(
        r'className="grid grid-cols-1 md:grid-cols-3 gap-6"',
        r'className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"',
        content
    )
    content = re.sub(
        r'className="grid grid-cols-1 md:grid-cols-4 gap-6"',
        r'className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"',
        content
    )

    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
    print(f"Refactored {f}")
