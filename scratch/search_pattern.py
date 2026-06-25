filepath = r"c:\kitchen-store-inventory-system\apps\web\src\components\shared\DocumentLineItemTable\DocumentLineItemTable.tsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content_norm = content.replace('\r\n', '\n')
lines = content_norm.split('\n')

for i, line in enumerate(lines):
    if "mobileLayoutPattern === 'adjustment-form'" in line:
        print(f"Line {i+1}: {repr(line)}")
        for j in range(max(0, i-5), min(len(lines), i+45)):
            print(f"  {j+1}: {repr(lines[j])}")
        print("="*40)
