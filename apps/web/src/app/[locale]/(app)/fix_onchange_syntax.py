import os
import re

directories = [
    'apps/web/src/app/[locale]/(app)',
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Replace onChange=(e) => { ... } with onChange={(e) => { ... }}
    # We want to match: onChange=(e) => { something }
    # Let's match onChange=(e) => { ... }
    # where the body of onChange is a single line, or brace-enclosed.
    # Pattern: onChange=\(([^)]*)\)\s*=>\s*\{([^}]+)\}
    # Replacement: onChange={( \1 ) => { \2 }}
    pattern = r'onChange=\(\s*e\s*\)\s*=>\s*\{([^}]+)\}'
    replacement = r'onChange={(e) => {\1}}'
    
    content = re.sub(pattern, replacement, content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed onChange syntax in {filepath}")

for d in directories:
    if os.path.exists(d):
        for root, dirs, files in os.walk(d):
            for file in files:
                if file.endswith('Client.tsx'):
                    process_file(os.path.join(root, file))
