import os
import re

src_dir = r"E:\kitchen-store-inventory-system\apps\web\src"

# Regular expression to match apiClient method calls: get, post, put, patch, del
api_call_pattern = re.compile(r'apiClient\.(get|post|put|patch|del)\((.*?)\)', re.DOTALL)

errors = []

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Simple check: search forApiClient calls
            for match in re.finditer(r'apiClient\.(get|post|put|patch|del)\((.*?)\)', content, re.DOTALL):
                method = match.group(1)
                args_str = match.group(2)
                
                # To handle nesting of parentheses, let's do a basic brace matching
                # starting from match.start() + len(apiClient.method()
                start_idx = match.start()
                open_bracket_idx = content.find('(', start_idx)
                
                # Simple parenthesis matching to extract the exact arguments
                depth = 0
                end_idx = open_bracket_idx
                for idx in range(open_bracket_idx, len(content)):
                    char = content[idx]
                    if char == '(':
                        depth += 1
                    elif char == ')':
                        depth -= 1
                        if depth == 0:
                            end_idx = idx
                            break
                
                args_content = content[open_bracket_idx+1:end_idx]
                
                # Let's parse arguments by splitting commas, but taking care of nested blocks/brackets/parentheses
                args = []
                current_arg = []
                p_depth = 0
                b_depth = 0
                c_depth = 0
                in_single_quote = False
                in_double_quote = False
                in_template = False
                
                i = 0
                while i < len(args_content):
                    char = args_content[i]
                    if char == "'" and not in_double_quote and not in_template:
                        in_single_quote = not in_single_quote
                    elif char == '"' and not in_single_quote and not in_template:
                        in_double_quote = not in_double_quote
                    elif char == '`' and not in_single_quote and not in_double_quote:
                        in_template = not in_template
                    elif not in_single_quote and not in_double_quote and not in_template:
                        if char == '(':
                            p_depth += 1
                        elif char == ')':
                            p_depth -= 1
                        elif char == '{':
                            b_depth += 1
                        elif char == '}':
                            b_depth -= 1
                        elif char == '[':
                            c_depth += 1
                        elif char == ']':
                            c_depth -= 1
                        elif char == ',' and p_depth == 0 and b_depth == 0 and c_depth == 0:
                            args.append(''.join(current_arg).strip())
                            current_arg = []
                            i += 1
                            continue
                    current_arg.append(char)
                    i += 1
                if current_arg:
                    args.append(''.join(current_arg).strip())
                
                # Let's inspect the arguments.
                # If an argument is exactly 'signal', then we have a problem!
                # Wait, if an argument is exactly 'signal', it should have been wrapped in '{ signal }' or similar.
                for idx, arg in enumerate(args):
                    if arg == 'signal':
                        line_no = content[:start_idx].count('\n') + 1
                        errors.append({
                            'file': path,
                            'line': line_no,
                            'method': method,
                            'arg_idx': idx,
                            'args': args,
                            'full_call': content[start_idx:end_idx+1]
                        })

print(f"Found {len(errors)} potential errors:")
for err in errors:
    print(f"File: {err['file']}:{err['line']}")
    print(f"  Method: {err['method']}")
    print(f"  Arg index: {err['arg_idx']}")
    print(f"  Full call: {err['full_call']}")
    print("-" * 50)
