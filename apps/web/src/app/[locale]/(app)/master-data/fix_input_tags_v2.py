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
            
        if placeholder.startswith('tc') or placeholder.startswith('t(') or placeholder.startswith('ti('):
            placeholder_str = f"{{{placeholder}}}"
        elif placeholder.startswith('"') or placeholder.startswith("'"):
            placeholder_str = placeholder
        else:
            placeholder_str = f'"{placeholder}"'
            
        # Try to fix the quotes issue if any
        placeholder_str = placeholder_str.replace("\\'", "'")
            
        # extract value
        val_match = re.search(r'value=\{([^}]+)\}', block)
        value = val_match.group(1) if val_match else 'search'
        
        # extract onChange
        onc_match = re.search(r'onChange=\{([^}]+\})\}\s*\}?', block) # matches until first }, but we need full function
        # A more robust regex for onChange:
        onc_match = re.search(r'onChange=\{\(e\) => \{[^}]+\}\}', block)
        if onc_match:
            on_change = onc_match.group(0)[10:-1] # extract inside onChange={}
        else:
            on_change = '{ (e) => setSearch(e.target.value) }'

        return f'''filters={{
            <div className="relative w-full sm:max-w-md flex-1">
              <input
                type="text"
                placeholder={placeholder_str}
                value={{{value}}}
                onChange={on_change}
                className="w-full h-10 pr-10 pl-4 bg-white dark:bg-card-dark border border-gray-200 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white focus:ring-1 focus:ring-operational-cyan outline-none shadow-sm transition-all"
              />
              <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
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
