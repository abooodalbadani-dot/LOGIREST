import os
import re

def fix_links(directory):
    # Regex patterns:
    # 1. `/ ${locale}` -> `/${locale}` (at the start of a template literal)
    # 2. `.../ ${variable}` -> `.../${variable}`
    # 3. `.../ locale` -> `.../locale` (literal but with space)
    
    patterns = [
        (r'`/ \$\{locale\}', r'`/${locale}'),
        (r'/ \$\{', r'/${'),
        (r'\$\{locale\} /', r'${locale}/'),
        (r'href={`/ ', r'href={`/'),
        (r'push\(`/ ', r'push\(`/'),
        (r'/${locale}/ ', r'/${locale}/'),
    ]

    count = 0
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    new_content = content
                    for pattern, replacement in patterns:
                        new_content = re.sub(pattern, replacement, new_content)
                    
                    if new_content != content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Fixed links in: {filepath}")
                        count += 1
                except Exception as e:
                    print(f"Error processing {filepath}: {e}")
    
    print(f"Total files fixed: {count}")

if __name__ == "__main__":
    fix_links('src')
