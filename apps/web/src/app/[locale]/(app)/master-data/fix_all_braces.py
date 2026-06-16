import os
import re

directories = [
    'apps/web/src/app/[locale]/(app)',
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Find cases like `onChange={(e) => { setSearch(e.target.value); }` missing the final `}`
    # Note: `[^}]+` matches everything until the first `}`, which corresponds to the inner `}`
    # We want to replace it by adding the final `}`
    
    # We will specifically match the exact pattern since it's safer:
    # `onChange={(e) => { something }\n` -> `onChange={(e) => { something }}\n`
    
    # Let's match line by line:
    lines = content.split('\n')
    for i in range(len(lines)):
        line = lines[i]
        if 'onChange={(e) => {' in line and line.count('{') > line.count('}'):
            lines[i] = line + '}'
            
    content = '\n'.join(lines)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed brace in {filepath}")

for d in directories:
    if os.path.exists(d):
        for root, dirs, files in os.walk(d):
            for file in files:
                if file.endswith('Client.tsx'):
                    process_file(os.path.join(root, file))
