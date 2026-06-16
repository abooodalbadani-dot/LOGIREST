import glob, os, re

files = glob.glob('apps/web/src/app/**/*Form*.tsx', recursive=True) + glob.glob('apps/web/src/features/**/*form*.tsx', recursive=True)

for f in files:
    if os.path.isfile(f):
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        
        replacements = [
            ('<div className="flex items-center gap-3 pb-4', '<div className="col-span-1 md:col-span-12 flex items-center gap-3 pb-4'),
            ('<div className="flex items-center gap-3 p-4 bg-amber-500/5', '<div className="col-span-1 md:col-span-12 flex items-center gap-3 p-4 bg-amber-500/5'),
            ('<ul className="space-y-4">', '<ul className="col-span-1 md:col-span-12 space-y-4">'),
            ('<div className="space-y-8">', '<div className="col-span-1 md:col-span-12 space-y-8">'),
            ('<div className="flex items-center justify-between p-4 bg-surface-container-highest/10', '<div className="col-span-1 md:col-span-12 flex items-center justify-between p-4 bg-surface-container-highest/10')
        ]
        
        original = content
        for old, new in replacements:
            content = content.replace(old, new)
            
        content = content.replace('className="col-span-1 md:col-span-12 col-span-1 md:col-span-12', 'className="col-span-1 md:col-span-12')
        
        if content != original:
            with open(f, 'w', encoding='utf-8') as file:
                file.write(content)
            print('Fixed layout in', f)
