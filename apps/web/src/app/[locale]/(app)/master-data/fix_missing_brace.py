import os

directories = [
    'apps/web/src/app/[locale]/(app)',
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Replace `onChange={(e) => { setSearch(e.target.value); setPage(1); }`
    # with `onChange={(e) => { setSearch(e.target.value); setPage(1); }}`
    content = content.replace(
        'onChange={(e) => { setSearch(e.target.value); setPage(1); }\n',
        'onChange={(e) => { setSearch(e.target.value); setPage(1); }}\n'
    )
    
    # Check for cases with spacing differences
    import re
    content = re.sub(
        r'onChange=\{\(e\) => \{ setSearch\(e\.target\.value\); setPage\(1\); \}\n',
        r'onChange={(e) => { setSearch(e.target.value); setPage(1); }}\n',
        content
    )

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed missing brace in {filepath}")

for d in directories:
    if os.path.exists(d):
        for root, dirs, files in os.walk(d):
            for file in files:
                if file.endswith('Client.tsx'):
                    process_file(os.path.join(root, file))
