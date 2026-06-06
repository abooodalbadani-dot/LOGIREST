import os
import re

src_dir = r"e:\kitchen-store-inventory-system\apps\web\src"
calls = []

# Regex to match apiClient.<method>(...)
api_call_pattern = re.compile(r"apiClient\.(get|post|put|patch|del)\b", re.DOTALL)

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith((".ts", ".tsx")):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            
            # Simple match for signal usage in apiClient calls
            for match in re.finditer(r"apiClient\.(get|post|put|patch|del)\b", content):
                start = match.start()
                # find matching parenthesis
                paren_count = 0
                end = start
                found_paren = False
                while end < len(content):
                    if content[end] == '(':
                        paren_count += 1
                        found_paren = True
                    elif content[end] == ')':
                        paren_count -= 1
                        if found_paren and paren_count == 0:
                            end += 1
                            break
                    end += 1
                
                call_text = content[start:end]
                line_no = content[:start].count("\n") + 1
                rel_path = os.path.relpath(path, src_dir)
                calls.append({
                    "file": rel_path,
                    "line": line_no,
                    "method": match.group(1),
                    "text": call_text.strip()
                })

out_path = r"e:\kitchen-store-inventory-system\scratch\api_calls.txt"
with open(out_path, "w", encoding="utf-8") as f:
    f.write(f"Found {len(calls)} apiClient calls:\n")
    for c in sorted(calls, key=lambda x: (x["file"], x["line"])):
        f.write(f"{c['file']}:{c['line']} [{c['method']}] -> {c['text'].replace(chr(10), ' ')}\n")

print(f"Written {len(calls)} calls to scratch/api_calls.txt")
