import re

po_file = r"c:\kitchen-store-inventory-system\apps\web\src\features\purchasing\components\purchase-order-line-items.tsx"

with open(po_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Search for the unitPrice FormField block and replace the raw <input with <Input
# and remove the dir="ltr"
# Let's check if we can match the input tag inside unitPrice field
pattern = r'(name={`lines\.\$\{index\}\.unitPrice`}[\s\S]*?<FormControl>[\s\S]*?)<input([\s\S]*?dir="ltr"[\s\S]*?/>)'

match = re.search(pattern, content)
if match:
    print("Found unitPrice input match!")
    # Let's do the replacement
    control_part = match.group(1)
    input_attributes = match.group(2)
    # Replace <input with <Input and remove dir="ltr"
    clean_attributes = input_attributes.replace('dir="ltr"', '')
    replacement = f"{control_part}<Input{clean_attributes}"
    new_content = content.replace(match.group(0), replacement)
    with open(po_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced unitPrice raw input!")
else:
    print("Did not find unitPrice match.")
