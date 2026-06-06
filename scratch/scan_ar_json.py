import json
import re

file_path = r'e:\kitchen-store-inventory-system\apps\web\messages\ar.json'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find any script tags (including malformed ones and escapes)
    script_patterns = [
        r'<script',
        r'</script',
        r'javascript:',
        r'on\w+\s*=',
        r'<\s*s\s*c\s*r\s*i\s*p\s*t',
        r'\\u003cscript',
        r'\\u003c/script',
        r'\\u003c\s*script'
    ]
    
    found_any = False
    for pattern in script_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        if matches:
            print(f"Found {len(matches)} matches for pattern '{pattern}'")
            found_any = True
            
    # Find any HTML tags
    tags = re.findall(r'<[^>]+>', content)
    if tags:
        print(f"Found {len(tags)} HTML-like tags:")
        for tag in tags[:20]:
            print(tag)
        found_any = True
            
    if not found_any:
        print("No suspicious patterns or tags found.")
        
    # Check for non-printable characters (except common whitespace)
    non_printable = [c for c in content if ord(c) < 32 and c not in '\n\r\t']
    if non_printable:
        print(f"Found {len(non_printable)} non-printable characters.")
    
    # Check for double backslashes which might be escaping issues
    double_slashes = re.findall(r'\\\\', content)
    if double_slashes:
        print(f"Found {len(double_slashes)} double backslashes (\\\\).")

    # Check for unclosed braces or quotes
    # (Simple count check)
    if content.count('{') != content.count('}'):
        print(f"Brace mismatch: {{: {content.count('{')}, }}: {content.count('}')}")
    if content.count('"') % 2 != 0:
        print(f"Quote mismatch: {content.count('\"')} quotes found.")

    try:
        json.loads(content)
        print("JSON is valid.")
    except json.JSONDecodeError as e:
        print(f"JSON Error: {e}")

except Exception as e:
    print(f"Error reading file: {e}")
