import os
import re

def find_missing_keys(directory):
    map_pattern = re.compile(r'\.map\s*\(\s*\(.*?\)\s*=>\s*<([A-Z][a-zA-Z0-9]*|div|span|li|tr|td|p|h[1-6])')
    key_pattern = re.compile(r'key=[\'"{]')
    
    results = []
    
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.next' in dirs:
            dirs.remove('.next')
            
        for file in files:
            if file.endswith(('.tsx', '.jsx')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    lines = content.split('\n')
                    
                    for i, line in enumerate(lines):
                        if '.map(' in line:
                            # Look ahead a few lines for the opening tag
                            snippet = "\n".join(lines[i:i+5])
                            match = map_pattern.search(snippet)
                            if match:
                                if not key_pattern.search(snippet):
                                    results.append(f"{path}:{i+1} - Potential missing key in .map()")
                                    
    return results

if __name__ == "__main__":
    # Ensure stdout handles unicode
    import sys
    import io
    if hasattr(sys.stdout, 'buffer'):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        
    src_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'apps', 'web', 'src'))
    # Use a safe print or just print to stderr
    sys.stdout.write(f"Scanning {src_dir} for missing React keys...\n")
    missing = find_missing_keys(src_dir)
    if missing:
        sys.stdout.write("\n".join(missing) + "\n")
        sys.stdout.write(f"\nTotal potential issues: {len(missing)}\n")
    else:
        sys.stdout.write("No obvious missing keys found.\n")
