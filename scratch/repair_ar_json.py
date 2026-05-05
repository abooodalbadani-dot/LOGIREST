
import json
import re

def recover_string(s):
    if not s: return s
    # Common Mojibake: UTF-8 read as CP1256
    try:
        # We need to handle the fact that some bytes might have been 
        # interpreted as CP1252 chars (like the soft hyphen or the double dagger)
        # instead of CP1256.
        # Let's try to map them back to bytes.
        
        # A common set of chars that appear when UTF-8 is read as CP1256/CP1252
        # is problematic. Let's try a direct approach:
        b = s.encode('cp1256', errors='ignore')
        return b.decode('utf-8', errors='ignore')
    except:
        return s

def fix_json_syntax(content):
    # Fix the specific pattern found: .",something",
    content = re.sub(r'\.",[^"]+",', r'",', content)
    # Fix double descriptions
    content = re.sub(r'("reject_desc": "[^"]+"),[^"]+",', r'\1",', content)
    
    # Try to find lines that are merged
    # e.g. "key": "value" "next_key": "next_value"
    content = re.sub(r'(":[^"]+")\s*("[^"]+":)', r'\1,\n\2', content)
    
    return content

def main():
    path = 'messages/ar.json'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pre-fix syntax
    content = fix_json_syntax(content)
    
    # Try to parse. If it fails, we need more aggressive fixing.
    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        print(f"Initial JSON parse failed: {e}")
        # Let's try to fix line by line
        lines = content.split('\n')
        new_lines = []
        for i, line in enumerate(lines):
            # If a line has multiple key-value pairs, split them
            # This is a common corruption in this file
            line = re.sub(r'("[^"]+":\s*"[^"]+")\s*("[^"]+":)', r'\1,\n\2', line)
            new_lines.append(line)
        content = '\n'.join(new_lines)
        
        # Try again with some manual fixes for known broken lines
        # Line 1195 and 1197 were reported as broken
        # Let's just remove everything after the first valid entry on those lines
        try:
            data = json.loads(content)
        except:
            print("Still failing. Using regex to extract keys and values.")
            # Last resort: extract all "key": "value" pairs and rebuild
            pairs = re.findall(r'"([^"]+)":\s*"([^"]+)"', content)
            # This won't preserve nesting perfectly but might recover strings
            data = {}
            for k, v in pairs:
                data[k] = recover_string(v)
            
            with open('messages/ar_recovered.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print("Recovered into ar_recovered.json (flat structure)")
            return

    # Recursive recovery of strings
    def recover_dict(d):
        for k, v in d.items():
            if isinstance(v, dict):
                recover_dict(v)
            elif isinstance(v, str):
                d[k] = recover_string(v)
    
    recover_dict(data)
    
    # Apply terminology harmonization
    terms = {
        "Purchase Request": "طلب شراء",
        "Purchase Order": "أمر شراء",
        "Goods Received Note": "إذن استلام",
        "Stock Movement": "حركة مخزون",
        "Adjustment": "تسوية مخزون",
        "Transfer": "تحويل مخزون",
        "Stocktake": "جرد مخزون",
        "Ledger": "سجل الحركات",
        "FX Rate": "سعر الصرف",
        "Unit of Measure": "وحدة قياس",
        "Inventory": "المخزون"
    }
    
    # ... we'll do terminology fix in a next step if needed ...

    with open('messages/ar.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Successfully repaired ar.json")

if __name__ == '__main__':
    main()
