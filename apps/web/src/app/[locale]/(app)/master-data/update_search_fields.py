import os
import re

directories = [
    r'apps/web/src/app/[locale]/(app)/master-data',
]

def update_search_fields(filepath):
    print(f"Checking file: {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Regex to find:
    # <div className="relative w-full sm:max-w-sm shrink-0">
    #   <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
    #   <Input
    #    placeholder={...}
    #    value={...}
    #    onChange={...}
    #    className="w-full ps-10 bg-background border-border text-foreground focus:border-brand-gold shrink-0 rounded-lg transition-all"
    #   />
    # </div>
    
    pattern = re.compile(
        r'(<div className="relative w-full sm:max-w-sm shrink-0">)\s*([ \t]*<Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />)\s*(<Input\s+placeholder=\{[^}]+\}\s+value=\{[^}]+\}\s+onChange=\{[^}]+\}\s+className="w-full ps-10 bg-background border-border text-foreground focus:border-brand-gold shrink-0 rounded-lg transition-all"\s*/>)',
        re.DOTALL
    )
    
    # Wait, some Inputs might be multi-line or have properties in different orders, or be like:
    # <Input
    #  placeholder={tc('search')}
    #  value={search}
    #  onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full ps-10 bg-background...
    # Let's write a more robust replacement using a function match
    
    def replacer(match):
        print(f"Matched exact pattern in {filepath}!")
        # Let's reconstruct it
        # We need to extract the Input properties dynamically
        return match.group(0)

    # Let's parse it using a more general regex that captures components
    # We want to match:
    # 1. Parent div
    # 2. Search icon
    # 3. Input
    
    # We can match:
    # <div className="relative w-full sm:max-w-sm shrink-0">
    # followed by <Search ... />
    # followed by <Input ... />
    # followed by </div>
    
    # Let's search specifically for the div block containing <Search and <Input
    div_pattern = re.compile(
        r'(<div className="relative w-full sm:max-w-sm shrink-0">)\s*(<Search[^>]*?>)\s*(<Input[^>]*?className="w-full ps-10 bg-background border-border text-foreground focus:border-brand-gold shrink-0 rounded-lg transition-all"[^>]*?>)\s*(</div>)',
        re.DOTALL
    )

    # Wait, what if there's self-closing or non-self-closing input tags? Standard shadcn inputs are self-closing: <Input />
    # Let's inspect the matches.
    # To be extremely safe and robust:
    # We find '<div className="relative w-full sm:max-w-sm shrink-0">'
    # inside filters or generally in the file, and if the next elements are Search and Input with that className, we replace them.
    
    # Let's do a strict multi-line regex search and replace:
    
    # We can search for the entire block:
    # <div className="relative w-full sm:max-w-sm shrink-0">
    #   <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
    #   <Input
    #    ...
    #    className="w-full ps-10 bg-background border-border text-foreground focus:border-brand-gold shrink-0 rounded-lg transition-all"
    #   />
    #  </div>
    
    # Let's match `<div className="relative w-full sm:max-w-sm shrink-0">`
    # and then the Search icon, and then the Input.
    
    # Since we know the exact files and lines, let's write a regex that matches:
    # <div className="relative w-full sm:max-w-sm shrink-0">
    # and captures everything up to the closing </div>
    
    def repl_block(match):
        block = match.group(0)
        
        # Replace the class on the outer div to add 'group'
        block = block.replace('className="relative w-full sm:max-w-sm shrink-0"', 'className="relative w-full sm:max-w-sm shrink-0 group"')
        
        # Replace Search icon classes:
        # From: className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
        # To: className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-foreground transition-colors pointer-events-none"
        block = block.replace(
            'className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"',
            'className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-foreground transition-colors pointer-events-none"'
        )
        
        # Replace Input class:
        # From: className="w-full ps-10 bg-background border-border text-foreground focus:border-brand-gold shrink-0 rounded-lg transition-all"
        # To: className="w-full h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors text-label-sm font-bold text-foreground shrink-0 rounded-lg"
        block = block.replace(
            'className="w-full ps-10 bg-background border-border text-foreground focus:border-brand-gold shrink-0 rounded-lg transition-all"',
            'className="w-full h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors text-label-sm font-bold text-foreground shrink-0 rounded-lg"'
        )
        
        return block

    # Match the entire div block that wraps Search and Input with ps-10 bg-background
    pattern = re.compile(
        r'<div className="relative w-full sm:max-w-sm shrink-0">.*?<Search.*?<Input.*?ps-10 bg-background.*?</div>',
        re.DOTALL
    )
    
    content = pattern.sub(repl_block, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Successfully updated search field in: {filepath}")
    else:
        print(f"No match/change for: {filepath}")

# Process files
files_to_update = []
for directory in directories:
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx'):
                files_to_update.append(os.path.join(root, file))

for fp in files_to_update:
    update_search_fields(fp)
