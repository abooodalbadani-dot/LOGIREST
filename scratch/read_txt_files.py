import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def read_utf16_file(path):
    if not os.path.exists(path):
        return f"File {path} not found"
    try:
        with open(path, 'r', encoding='utf-16le', errors='ignore') as f:
            content = f.read()
        if content.startswith('\ufeff'):
            content = content[1:]
        return content
    except Exception as e:
        return f"Error reading {path}: {e}"

files_to_read = [
    "build_output.txt",
    "build_output_fresh_2.txt",
    "build_latest_5.txt",
    "build_report_final.txt"
]

for fname in files_to_read:
    print(f"=== {fname} ===")
    content = read_utf16_file(fname)
    lines = content.splitlines()
    print(f"Total lines: {len(lines)}")
    # Print the last 30 lines (which usually contain errors/summaries)
    for line in lines[-30:]:
        safe_line = line.encode('ascii', errors='replace').decode('ascii')
        print(safe_line)
    print("-" * 40)
