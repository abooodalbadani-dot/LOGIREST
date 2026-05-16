import sys

def find_premature_closure(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    balance = 0
    in_string = False
    escape = False
    
    for i, char in enumerate(content):
        if char == '"' and not escape:
            in_string = not in_string
        
        if not in_string:
            if char == '{':
                balance += 1
            elif char == '}':
                balance -= 1
                if balance == 0:
                    # Find line number
                    line_no = content.count('\n', 0, i) + 1
                    print(f"Object closed at line {line_no}")
                    # Print context
                    lines = content.splitlines()
                    start = max(0, line_no - 3)
                    end = min(len(lines), line_no + 3)
                    for j in range(start, end):
                        print(f"{j+1}: {lines[j]}")
                    
                    if i < len(content) - 1:
                        # Check if there's more non-whitespace data
                        rest = content[i+1:].strip()
                        if rest:
                            print(f"EXTRA DATA FOUND after line {line_no}")
                            return
        
        if char == '\\':
            escape = not escape
        else:
            escape = False

if __name__ == "__main__":
    print("Checking en.json...")
    find_premature_closure(r"e:\Kitchen‑Store Inventory System\apps\web\messages\en.json")
    print("\nChecking ar.json...")
    find_premature_closure(r"e:\Kitchen‑Store Inventory System\apps\web\messages\ar.json")
