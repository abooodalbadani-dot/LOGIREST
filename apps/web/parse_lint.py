
import re

def parse_lint(file_path):
    with open(file_path, 'r', encoding='utf-16le') as f:
        content = f.read()
    
    # Split by double newline to get blocks
    blocks = content.split('\n\n')
    
    current_file = ""
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        
        # Check if block is a file path
        if block.startswith('E:\\') or block.startswith('src/'):
            current_file = block
            continue
            
        # Check if block contains errors
        if 'error' in block.lower() and '@typescript-eslint/no-explicit-any' in block:
            lines = block.split('\n')
            for line in lines:
                if 'error' in line and '@typescript-eslint/no-explicit-any' in line:
                    print(f"{current_file}: {line.strip()}")

if __name__ == "__main__":
    parse_lint('lint_output.txt')
