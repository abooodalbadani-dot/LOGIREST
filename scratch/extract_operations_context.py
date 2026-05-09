with open('apps/web/messages/ar.json', 'rb') as f:
    content = f.read()

import re
matches = list(re.finditer(b'"operations":', content))
with open('scratch/operations_context.txt', 'w', encoding='utf-8') as f_out:
    for i, m in enumerate(matches):
        f_out.write(f"\n--- Match {i+1} at byte {m.start()} ---\n")
        start = max(0, m.start() - 100)
        end = min(len(content), m.start() + 500)
        # Using decode with replace and then writing to utf-8 file should be safe
        f_out.write(content[start:end].decode('utf-8', errors='replace'))
        f_out.write("\n")

print("Context written to scratch/operations_context.txt")
