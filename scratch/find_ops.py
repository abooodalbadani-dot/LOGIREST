import json

def get_line_numbers(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We want to find where "operations": { starts
    # and where "issue": { starts inside that
    
    lines = content.splitlines()
    ops_starts = []
    for i, line in enumerate(lines):
        if '"operations":' in line and '{' in line:
            ops_starts.append(i + 1)
            
    return ops_starts

print(f"EN ops: {get_line_numbers('E:/Kitchen\u2011Store Inventory System/apps/web/messages/en.json')}")
print(f"AR ops: {get_line_numbers('E:/Kitchen\u2011Store Inventory System/apps/web/messages/ar.json')}")
