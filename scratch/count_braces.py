en_path = r"e:\kitchen-store-inventory-system\apps\web\messages\en.json"

with open(en_path, 'r', encoding='utf-8') as f:
    content = f.read()
    
opened = 0
for i, char in enumerate(content):
    if char == '{':
        opened += 1
    elif char == '}':
        opened -= 1
        if opened == 0:
            # Find line number
            line_no = content.count('\n', 0, i) + 1
            print(f"JSON closed at line {line_no}")
            # Show next 20 characters
            print(f"Next chars: {repr(content[i+1:i+21])}")
            # If there's more after this, it's extra data
            if any(c.strip() for c in content[i+1:]):
                print("More non-whitespace content follows!")
            break
