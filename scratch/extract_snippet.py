with open('apps/web/messages/ar.json', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

import re
pattern = r'"export": "[^"]*'
match = re.search(pattern, content)
if match:
    snippet = content[match.start()-100 : match.end()+200]
    with open('scratch/snippet.txt', 'w', encoding='utf-8') as f:
        f.write(snippet)
    print(f"Snippet written to scratch/snippet.txt")
else:
    print("Pattern not found")
