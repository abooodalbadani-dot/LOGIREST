import os
import re

directories = [
    'apps/web/src/app/[locale]/(app)',
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

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
            <div className="relative w-full sm:max-w-sm">
              <input
                type="text"
                placeholder={placeholder_str}
                value={{{value}}}
                onChange={{{on_change}}}
                className="w-full h-10 pr-10 pl-4 bg-white dark:bg-card-dark border border-gray-300 dark:border-neutral-700 rounded-lg text-text-main dark:text-white focus:ring-1 focus:ring-operational-cyan focus:border-operational-cyan outline-none transition-colors shadow-sm"
              />
              <Search className="absolute right-3 top-2.5 text-gray-400 h-5 w-5" />
            </div>
          }}'''

    # Matches filters={{...}} containing either <Input or <input
    content = re.sub(r'filters=\{.*?(?:<[Ii]nput.*?\/>).*?(?:<Search.*?\/>)?.*?^\s*\}', replacer, content, flags=re.DOTALL | re.MULTILINE)

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
