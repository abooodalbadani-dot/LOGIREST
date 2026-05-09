with open('apps/web/messages/ar.json', 'rb') as f:
    content = f.read()

import re
matches = list(re.finditer(b'"suppliers":', content))
print(f"Found {len(matches)} occurrences of 'suppliers':")
for i, m in enumerate(matches):
    print(f"Match {i+1} at byte {m.start()}")
