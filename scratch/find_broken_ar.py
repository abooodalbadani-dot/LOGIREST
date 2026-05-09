with open('apps/web/messages/ar.json', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

import re
pattern = r'"export": "[^"]*'
match = re.search(pattern, content)
if match:
    print(f"Found broken part at {match.start()}:")
    print(repr(content[match.start()-50 : match.end()+100]))
else:
    print("Pattern not found with errors='replace'")
