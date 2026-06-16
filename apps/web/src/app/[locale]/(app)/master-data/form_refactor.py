import os
import glob
import re

files = glob.glob('apps/web/src/app/**/*Form*.tsx', recursive=True) + glob.glob('apps/web/src/app/**/*form*.tsx', recursive=True)

def find_closing_tag(text, start_idx, tag_name):
    depth = 1
    i = start_idx
    open_pattern = re.compile(f'<{tag_name}[>\s]')
    close_pattern = re.compile(f'</{tag_name}>')
    
    while i < len(text):
        open_match = open_pattern.search(text, i)
        close_match = close_pattern.search(text, i)
        
        if not close_match:
            return -1
            
        if open_match and open_match.start() < close_match.start():
            depth += 1
            i = open_match.start() + 1
        else:
            depth -= 1
            if depth == 0:
                return close_match.start()
            i = close_match.end()
            
    return -1

def unwrap_tag(text, tag_name):
    while True:
        match = re.search(f'<{tag_name}(?:[^>]+)?>', text)
        if not match:
            break
        
        start_idx = match.end()
        end_idx = find_closing_tag(text, start_idx, tag_name)
        
        if end_idx == -1:
            break
            
        text = text[:match.start()] + text[start_idx:end_idx] + text[end_idx + len(f'</{tag_name}>'):]
        
    return text

def unwrap_divs(text):
    while True:
        # We only want to unwrap the main form grids and sidebars
        # Not the individual input wrappers
        match = re.search(r'<div\s+className="(col-span-1 md:col-span-8|col-span-1 md:col-span-4)\s+space-y-[0-9]+\s+w-full"[^>]*>', text)
        if not match:
            match = re.search(r'<div\s+className="w-full grid grid-cols-1 md:grid-cols-12 gap-6"[^>]*>', text)
        if not match:
            break
            
        start_idx = match.end()
        end_idx = find_closing_tag(text, start_idx, 'div')
        
        if end_idx == -1:
            break
            
        text = text[:match.start()] + text[start_idx:end_idx] + text[end_idx + len('</div>'):]
    return text

def refactor():
    for f in files:
        if not os.path.isfile(f): continue
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
            
        original = content
        
        content = unwrap_tag(content, 'Card')
        content = unwrap_tag(content, 'CardContent')
        content = unwrap_divs(content)
        
        if content != original:
            with open(f, 'w', encoding='utf-8') as file:
                file.write(content)
            print(f"Refactored {f}")

refactor()
