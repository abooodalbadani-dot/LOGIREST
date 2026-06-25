import os
import re

# Colors to replace:
# hex: #b48e67 (case-insensitive) -> #b48e67
# RGB values: 
#   180, 142, 103 -> 180, 142, 103
#   180,142,103 -> 180,142,103
# HSL values:
#   30 34% 55% -> 30 34% 55%

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        # Skip binary files
        return False
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False

    original = content
    
    # Replace hex codes case-insensitively
    content = re.sub(r'#b48e67', '#b48e67', content, flags=re.IGNORECASE)
    content = re.sub(r'b48e67', 'b48e67', content, flags=re.IGNORECASE)
    
    # Replace RGB formats
    content = content.replace('180, 142, 103', '180, 142, 103')
    content = content.replace('180,142,103', '180,142,103')
    
    # Replace HSL format
    content = content.replace('30 34% 55%', '30 34% 55%')

    if content != original:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated: {filepath}")
            return True
        except Exception as e:
            print(f"Error writing {filepath}: {e}")
    return False

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    print(f"Scanning from root: {root_dir}")
    
    ignored_dirs = {
        '.git', 'node_modules', '.next', '.turbo', '.venv', 'coverage', 
        'dist', 'build', '.impeccable', '.codex', '.specify', '.venv'
    }
    
    # We want to replace in markdown files, ts, tsx, js, jsx, css, html, json, yml, yaml, env, py
    allowed_extensions = {
        '.ts', '.tsx', '.js', '.jsx', '.css', '.md', '.json', 
        '.html', '.yml', '.yaml', '.py', '.env', '.example', 'Caddyfile'
    }

    updated_count = 0
    
    for root, dirs, files in os.walk(root_dir):
        # Prune ignored directories in place
        dirs[:] = [d for d in dirs if d not in ignored_dirs]
        
        for file in files:
            filepath = os.path.join(root, file)
            
            # Skip massive log files or other files > 5MB
            try:
                if os.path.getsize(filepath) > 5 * 1024 * 1024:
                    continue
            except OSError:
                continue
                
            filename_lower = file.lower()
            _, ext = os.path.splitext(filename_lower)
            
            if ext in allowed_extensions or file == 'Caddyfile' or filename_lower.startswith('.env'):
                if replace_in_file(filepath):
                    updated_count += 1
                    
    print(f"Replacement complete. Total files updated: {updated_count}")

if __name__ == '__main__':
    main()
