import os
import re

src_dir = r"e:\Kitchen‑Store Inventory System\apps\web\src"
output_file = r"e:\Kitchen‑Store Inventory System\apps\web\scratch\apiclient_audit_results.txt"

# Regex to match apiClient calls
# We want to find apiClient.<method>(...)
api_call_pattern = re.compile(r'apiClient\.(get|post|put|patch|del)\((.*?)\)', re.DOTALL)

results = []

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception:
                try:
                    with open(filepath, 'r', encoding='latin-1') as f:
                        content = f.read()
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")
                    continue
            
            # Find all apiClient.method occurrences
            # Let's search line by line or using regex
            lines = content.splitlines()
            for idx, line in enumerate(lines):
                if 'apiClient.' in line and 'signal' in line:
                    results.append(f"{filepath}:{idx+1}: {line.strip()}")

with open(output_file, 'w', encoding='utf-8') as f:
    for res in results:
        f.write(res + '\n')

print(f"Found {len(results)} occurrences. Results written to {output_file}.")
