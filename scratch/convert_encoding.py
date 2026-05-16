import sys
from pathlib import Path

def convert_utf16_to_utf8(file_path):
    p = Path(file_path)
    if not p.exists():
        print(f"File not found: {file_path}")
        return
    
    try:
        content = p.read_bytes()
        # Try utf-16 (with or without BOM)
        try:
            text = content.decode('utf-16')
        except UnicodeDecodeError:
            text = content.decode('utf-16-le')
            
        p_out = p.with_name(p.stem + "_utf8.txt")
        p_out.write_text(text, encoding='utf-8')
        print(f"Converted {file_path} to {p_out}")
    except Exception as e:
        print(f"Error converting {file_path}: {e}")

if __name__ == "__main__":
    for arg in sys.argv[1:]:
        convert_utf16_to_utf8(arg)
