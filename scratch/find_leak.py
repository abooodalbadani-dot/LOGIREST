en_path = r"e:\kitchen-store-inventory-system\apps\web\messages\en.json"

with open(en_path, 'r', encoding='utf-8') as f:
    content = f.read()
    
level = 0
for i, char in enumerate(content):
    if char == '{':
        level += 1
    elif char == '}':
        level -= 1
        if level < 0:
            line_no = content.count('\n', 0, i) + 1
            print(f"Level dropped below 0 at line {line_no}")
            break
        if level == 0 and i < len(content) - 100: # If it closes too early
            line_no = content.count('\n', 0, i) + 1
            # Check context
            start = max(0, i - 50)
            end = min(len(content), i + 50)
            print(f"JSON root closed at line {line_no}")
            print(f"Context: {repr(content[start:end])}")
            # Continue to see if it happens again or if there are more
