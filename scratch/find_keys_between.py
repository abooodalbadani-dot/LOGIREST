with open('apps/web/messages/ar.json', 'rb') as f:
    content = f.read()

start = 26885
end = 116248
# This is too big to print, let's just find if there are closing braces that end the first operations block
# or if it's broken.

import re
# Find where Match 3 ends. It starts with "operations": { "issue": {
# Let's find the next top-level key after Match 3.
# Top level keys are like   "key": {

top_level_pattern = b'\n  "[^"]+": {'
matches = list(re.finditer(top_level_pattern, content[start:end]))
print(f"Found {len(matches)} top-level keys between Match 3 and Match 4.")
for m in matches:
    print(f"Key at {start + m.start()}: {repr(content[start + m.start() : start + m.start() + 50])}")
