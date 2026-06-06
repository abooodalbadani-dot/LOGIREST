en_path = r"e:\kitchen-store-inventory-system\apps\web\messages\en.json"

with open(en_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

level = 0
for i, line in enumerate(lines):
    opened = line.count('{')
    closed = line.count('}')
    
    prev_level = level
    level += opened - closed
    
    if i+1 >= 2378 and i+1 <= 2954:
        if level < 1:
            print(f"!!! Level dropped below 1 at line {i+1}: {line.strip()}")
        # Check if operations (level 2) closed early
        if i+1 > 2378 and level < 2:
            print(f"!!! Level dropped below 2 at line {i+1}: {line.strip()}")
            # Show context
            break
