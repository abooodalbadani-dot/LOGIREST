import os
import re

def find_malformed_links(directory):
    pattern = re.compile(r'\$\{locale\}\/\s+')
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        for i, line in enumerate(f):
                            if pattern.search(line):
                                print(f"FOUND: {filepath}:{i+1} -> {line.strip()}")
                except:
                    pass

if __name__ == "__main__":
    find_malformed_links('src')
