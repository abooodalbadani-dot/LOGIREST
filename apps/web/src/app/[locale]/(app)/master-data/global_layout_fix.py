import os
import re

directories = [
    'apps/web/src/app/[locale]/(app)',
    'apps/web/src/features',
    'apps/web/src/components'
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # 1. Inject `w-full flex flex-col flex-1 min-w-0 gap-6` to the root `return ( <div...>` wrapper
    # We look for the first `return (` followed by `<div className="..."`
    
    # We will use a regex to find the `return (\n    <div className="...` block.
    def root_replacer(match):
        pre = match.group(1)
        cls_str = match.group(2)
        post = match.group(3)
        
        # Remove restrictive classes from root
        cls_str = re.sub(r'\bw-fit\b', '', cls_str)
        cls_str = re.sub(r'\bmax-w-min\b', '', cls_str)
        cls_str = re.sub(r'\binline-flex\b', 'flex', cls_str)
        cls_str = re.sub(r'\binline-block\b', 'block', cls_str)
        cls_str = re.sub(r'\bw-auto\b', '', cls_str)
        
        classes = set(cls_str.split())
        
        # Add expansion classes
        classes.update(['w-full', 'flex', 'flex-col', 'flex-1', 'min-w-0', 'gap-6'])
        
        new_cls = ' '.join(filter(bool, classes))
        return f'{pre}className="{new_cls}"{post}'

    # Only apply root replacer to the outermost div of the component render
    # It usually looks like `return (\n <div className="..."` or similar
    content = re.sub(r'(return\s*\(\s*<div\s+)className="([^"]+)"(.*?>)', root_replacer, content, count=1)
    # Also handle `<main className="...">`
    content = re.sub(r'(return\s*\(\s*<main\s+)className="([^"]+)"(.*?>)', root_replacer, content, count=1)

    # 2. Universal Header & Toolbar Confinement
    # Replace anything resembling `<div className="w-full flex flex-col sm:flex-row justify-between...`
    # Ensure they have `w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`
    def header_replacer(match):
        return 'className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"'
        
    content = re.sub(
        r'className="[^"]*?flex flex-col sm:flex-row[^"]*?justify-between[^"]*?"',
        header_replacer,
        content
    )

    # 3. FormLayout fixes (MasterDataFormLayout)
    if 'MasterDataFormLayout.tsx' in filepath:
        content = content.replace(
            '<FormGridArea className="relative z-10 space-y-0">',
            '<FormGridArea className="relative z-10 space-y-0 w-full min-w-0">'
        )
        content = content.replace(
            '<FormContainer>',
            '<FormContainer className="w-full min-w-0 flex-1">'
        )

    # 4. "Magic Bullet" for components inside flex parents
    # The user says "Whenever a component is rendered inside a flex parent, it MUST have min-w-0 w-full"
    # The safest way is to add min-w-0 to the grid and flex columns
    content = re.sub(r'className="([^"]*?flex-col[^"]*?)"', 
                     lambda m: 'className="' + m.group(1) + ' min-w-0"' if 'min-w-0' not in m.group(1) else m.group(0), 
                     content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for d in directories:
    if os.path.exists(d):
        for root, dirs, files in os.walk(d):
            for file in files:
                if file.endswith('Client.tsx') or file.endswith('page.tsx') or file.endswith('Layout.tsx'):
                    process_file(os.path.join(root, file))
