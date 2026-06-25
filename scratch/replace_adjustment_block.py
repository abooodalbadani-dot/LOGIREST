filepath = r"c:\kitchen-store-inventory-system\apps\web\src\components\shared\DocumentLineItemTable\DocumentLineItemTable.tsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content_norm = content.replace('\r\n', '\n')
lines = content_norm.split('\n')

start_idx = None
end_idx = None

for i, line in enumerate(lines):
    if i > 600 and "mobileLayoutPattern === 'adjustment-form'" in line:
        start_idx = i
        break

if start_idx is not None:
    for j in range(start_idx + 1, len(lines)):
        if "variance-form" in lines[j]:
            end_idx = j
            break

if start_idx is not None and end_idx is not None:
    indent = lines[start_idx].split('{')[0]
    
    replacement_lines = [
        f"{indent}{{mobileLayoutPattern === 'adjustment-form' ? (",
        f"{indent} renderAdjustmentMobileCard(line)",
        f"{indent}) : mobileLayoutPattern === 'variance-form' ? ("
    ]
    
    new_lines = lines[:start_idx] + replacement_lines + lines[end_idx+1:]
    new_content = '\n'.join(new_lines).replace('\n', '\r\n')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS")
else:
    print(f"FAILED: start_idx={start_idx}, end_idx={end_idx}")
