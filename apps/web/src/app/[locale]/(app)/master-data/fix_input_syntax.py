import os
import re

directories = [
    'apps/web/src/app/[locale]/(app)',
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Fix placeholder="ti('search_placeholder')" to placeholder={ti('search_placeholder')}
    # Wait, ti might not exist. Let's fix that too.
    content = re.sub(r'placeholder="ti\(\'search_placeholder\'\)"', r'placeholder={tc(\'search_placeholder\')}', content)
    
    # Fix placeholder="tc('search_placeholder')" to placeholder={tc('search_placeholder')}
    content = re.sub(r'placeholder="tc\(\'search_placeholder\'\)"', r'placeholder={tc(\'search_placeholder\')}', content)
    
    # Fix duplicate value=
    # value={search\n                value={search}
    content = re.sub(r'value=\{[^\n]+\n\s+value=\{', 'value={', content)
    
    # Any case where it says value={search\n                value={search}
    # Let's just do a clean replacement:
    content = re.sub(r'value=\{[a-zA-Z]+\s*\n\s+value=\{([a-zA-Z]+)\}', r'value={\1}', content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed syntax in {filepath}")

for d in directories:
    if os.path.exists(d):
        for root, dirs, files in os.walk(d):
            for file in files:
                if file.endswith('Client.tsx'):
                    process_file(os.path.join(root, file))
