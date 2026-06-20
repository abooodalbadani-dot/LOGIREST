import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # If the file doesn't have a PageHeader, skip it
    if 'PageHeader' not in content:
        return

    # Replace description with subtitle
    # It might be description="..." or description={...}
    # We will just replace the word description= with subtitle= inside PageHeader tags.
    # To be safer, replace ' description=' with ' subtitle='
    
    # Let's find <PageHeader ... /> and modify its props
    
    # Since regex for nested tags is hard, we can just replace ' description=' with ' subtitle=' 
    # if it's likely a PageHeader prop. It's mostly safe since description is often used as a prop.
    # A safer way:
    # re.sub(r'(<PageHeader[^>]+)\bdescription=', r'\1subtitle=', content)
    # Wait, in React, tags can span multiple lines.
    
    def replacer(match):
        inner = match.group(1)
        # replace description
        inner = re.sub(r'\bdescription=', 'subtitle=', inner)
        # replace actions
        inner = re.sub(r'\bactions=', 'children=', inner)
        return f"<PageHeader{inner}>"
    
    new_content = re.sub(r'<PageHeader([^>]+)>', replacer, content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")

def main():
    directory = r"c:\kitchen-store-inventory-system\apps\web\src\app"
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.jsx'):
                process_file(os.path.join(root, file))
                
    directory2 = r"c:\kitchen-store-inventory-system\apps\web\src\features"
    for root, _, files in os.walk(directory2):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.jsx'):
                process_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
