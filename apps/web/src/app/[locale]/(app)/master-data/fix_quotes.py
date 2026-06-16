import os
import re

directories = [
    'apps/web/src/app/[locale]/(app)',
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    content = content.replace(r"tc(\'search_placeholder\')", "tc('search_placeholder')")
    content = content.replace(r"t(\'search_placeholder\')", "t('search_placeholder')")
    content = content.replace(r"tc(\'search\')", "tc('search')")
    content = content.replace(r"t(\'search\')", "t('search')")

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed quotes in {filepath}")

for d in directories:
    if os.path.exists(d):
        for root, dirs, files in os.walk(d):
            for file in files:
                if file.endswith('Client.tsx'):
                    process_file(os.path.join(root, file))
