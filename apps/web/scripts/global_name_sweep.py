import os
import re
import sys

# Set default encoding for stdout to utf-8 if it's not already
if sys.stdout.encoding != 'utf-8':
    try:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    except Exception:
        pass

replacements = [
    (re.compile(r'Ahmed Al-Mansour', re.IGNORECASE), 'Barakat Amin'),
    (re.compile(r'Ahmed Ali', re.IGNORECASE), 'Barakat Amin'),
    (re.compile(r'Ahmed Manager', re.IGNORECASE), 'Barakat Amin'),
    (re.compile(r'أحمد محمود'), 'بركات امين'),
    (re.compile(r'احمد المنصور'), 'بركات امين'),
    (re.compile(r'أحمد المنصور'), 'بركات امين'),
]

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src_dir = os.path.join(root_dir, 'src')

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.ts', '.tsx', '.json')):
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content
                for pattern, replacement in replacements:
                    new_content = pattern.sub(replacement, new_content)
                
                if new_content != content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    # Use a safer way to print potentially problematic characters
                    print(f"Updated a file in {root}")
            except Exception as e:
                # Avoid printing the full path if it crashes
                print(f"Error processing a file")

print("Global sweep completed.")
