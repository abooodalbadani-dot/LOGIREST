import re

def fix_ar_json(file_path):
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    
    fixed_lines = []
    for line in lines:
        # Fix lines like: "home": "الرئيسية      "list_title": "تسويات المخزون",
        if '      "list_title":' in line:
            # Split the line
            parts = line.split('      "list_title":')
            if len(parts) == 2:
                # Close the first part and start the second on a new line
                first_part = parts[0].strip()
                if not first_part.endswith('"') and not first_part.endswith('",'):
                    first_part += '",'
                fixed_lines.append(first_part + '\n')
                fixed_lines.append('      "list_title":' + parts[1])
                continue
        fixed_lines.append(line)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(fixed_lines)
    print("Fixed syntax errors in ar.json")

if __name__ == "__main__":
    fix_ar_json('messages/ar.json')
