import os
import re

directories = [
    'apps/web/src/app/[locale]/(app)',
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # The broken onChange looks like: onChange={(e) => { setSearch(e.target.value); setPage(1); }
    # Let's fix it by adding the closing brace: onChange={(e) => { setSearch(e.target.value); setPage(1); }}
    content = content.replace('onChange={(e) => { setSearch(e.target.value); setPage(1); }\n', 'onChange={(e) => { setSearch(e.target.value); setPage(1); }}\n')
    
    # What if there are others that were broken? 
    # e.g., onChange={(e) => setSearch(e.target.value)
    # The regex was: onChange=\{([^}]+)\}
    # If the original was: onChange={(e) => setSearch(e.target.value)}
    # the capture group was `(e) => setSearch(e.target.value)` and the replacement was `onChange={{(e) => setSearch(e.target.value)}}` Wait, the replacement string in python was `onChange={{{on_change}}}` which means `onChange={(e) => setSearch(e.target.value)}`. That is CORRECT for single-brace ones.
    
    # It only breaks when the original had internal braces, like `onChange={(e) => { setSearch(e.target.value); setPage(1); }}`
    # The capture group grabbed `(e) => { setSearch(e.target.value); setPage(1); ` because of `[^}]+`.
    # Then the replacement became `onChange={(e) => { setSearch(e.target.value); setPage(1); }` (missing the closing brace).
    
    # So we just need to find `onChange={(e) => { ... }` that lacks the final closing brace.
    # Look for: `onChange={(e) => { ... ; }` followed by newline
    content = re.sub(r'onChange=\{(.*?;\s*\})\n', r'onChange={\1}\n', content)

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
