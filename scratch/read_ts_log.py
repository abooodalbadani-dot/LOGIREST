import os
import sys

# Reconfigure stdout to use UTF-8 to avoid console encoding crashes on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

log_path = r"typescript-errors.log"
if os.path.exists(log_path):
    print("Log size:", os.path.getsize(log_path))
    # Read with UTF-16LE and strip BOM if present
    with open(log_path, 'r', encoding='utf-16le', errors='ignore') as f:
        content = f.read()
    
    # Strip BOM
    if content.startswith('\ufeff'):
        content = content[1:]
        
    lines = content.splitlines()
    print("Total lines:", len(lines))
    print("First 20 lines:")
    for line in lines[:20]:
        # Print only characters that can be printed, or encode/decode safely
        safe_line = line.encode('ascii', errors='replace').decode('ascii')
        print(safe_line)
else:
    print("File not found")
