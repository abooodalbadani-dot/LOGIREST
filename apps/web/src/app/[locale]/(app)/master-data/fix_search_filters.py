import os
import re

directories = [
    'apps/web/src/app/[locale]/(app)',
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Find the filters={ ... } block that contains an <Input ... />
    # We will use regex to extract placeholder, value, and onChange.
    
    # regex to find filters={<div... <Input ... /> ... </div>}
    
    def replacer(match):
        block = match.group(0)
        
        # extract placeholder
        ph_match = re.search(r'placeholder=\{?([^}]+)\}?', block)
        if not ph_match:
            ph_match = re.search(r'placeholder="([^"]+)"', block)
            placeholder = f'"{ph_match.group(1)}"' if ph_match else 'tc("search")'
        else:
            placeholder = ph_match.group(1)
            
        if placeholder.startswith('tc') or placeholder.startswith('t('):
            placeholder_str = f"{{{placeholder}}}"
        elif placeholder.startswith('"'):
            placeholder_str = placeholder
        else:
            placeholder_str = f'"{placeholder}"'
            
        # extract value
        val_match = re.search(r'value=\{([^}]+)\}', block)
        value = val_match.group(1) if val_match else 'search'
        
        # extract onChange
        onc_match = re.search(r'onChange=\{([^}]+)\}', block)
        on_change = onc_match.group(1) if onc_match else '(e) => setSearch(e.target.value)'

        return f'''filters={{
            <div className="relative w-full sm:max-w-md">
              <Input
                placeholder={placeholder_str}
                value={{{value}}}
                onChange={{{on_change}}}
                className="w-full h-10 pr-10 pl-4 bg-transparent border border-gray-200 dark:border-neutral-800 rounded-md focus:ring-1 focus:ring-operational-cyan focus:border-operational-cyan outline-none text-text-main dark:text-white"
              />
              <Search className="absolute right-3 top-2.5 text-gray-400 w-4 h-4" />
            </div>
          }}'''

    # Pattern: filters={ followed by anything non-greedily, until an Input is closed, then closing divs and }
    # This is tricky because of nested braces. Let's do a simpler text replacement if it matches the bloated style.
    
    # We can match `filters={` up to the next `/>` of `Search` and then `</div>` and `}`
    # Instead, let's just use a somewhat greedy regex up to the end of the filters block.
    # We assume filters block ends with `\n        }` or `\n          }`
    
    content = re.sub(r'filters=\{.*?(?:<Input.*?\/>).*?(?:<Search.*?\/>)?.*?^\s*\}', replacer, content, flags=re.DOTALL | re.MULTILINE)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated filters in {filepath}")

for d in directories:
    if os.path.exists(d):
        for root, dirs, files in os.walk(d):
            for file in files:
                if file.endswith('Client.tsx'):
                    process_file(os.path.join(root, file))
