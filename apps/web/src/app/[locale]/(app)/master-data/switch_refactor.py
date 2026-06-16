import os
import re

directories = [
    'apps/web/src/app/[locale]/(app)/master-data',
    'apps/web/src/app/[locale]/(app)/admin/settings',
    'apps/web/src/app/[locale]/(app)/communications',
    'apps/web/src/app/[locale]/(app)/profile'
]

files_to_check = []
for directory in directories:
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx'):
                files_to_check.append(os.path.join(root, file))

for filepath in files_to_check:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Use a regular expression to match the wrapper pattern
    # It usually starts with <div className="... flex items-center justify-between ...">
    # Then <div className="space-y-...">
    # Then <Label ...>...</Label>
    # Then <p ...>...</p>
    # Then </div>
    
    # We will look for <Label and <p or <span inside a flex-col
    
    def repl(match):
        wrapper_class = match.group(1)
        inner_div_class = match.group(2)
        label_content = match.group(3)
        p_content = match.group(4)
        
        # Replace only if it doesn't already have the new strict layout
        if 'flex-row items-center justify-between w-full rounded-lg' in wrapper_class:
            return match.group(0)

        new_wrapper = (
            '<div className="flex flex-row items-center justify-between w-full rounded-lg border border-gray-200 dark:border-neutral-800 p-4 shadow-sm bg-transparent transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">\n'
            '                <div className="flex flex-col space-y-1 text-right">\n'
            f'                  <span className="text-sm font-medium text-text-main dark:text-white">{label_content}</span>\n'
            f'                  <span className="text-xs text-gray-500 dark:text-gray-400">{p_content}</span>\n'
            '                </div>'
        )
        return new_wrapper

    # Regex to match the common wrapper pattern for Switches
    # Pattern:
    # <div className="[^"]*flex[^"]*justify-between[^"]*">
    # \s*<div className="[^"]*space-y-[^"]*">
    # \s*<Label[^>]*>(.*?)</Label>
    # \s*<p[^>]*>(.*?)</p>
    # \s*</div>
    
    pattern = re.compile(
        r'<div className="([^"]*?flex[^"]*?justify-between[^"]*?)">\s*<div className="([^"]*?space-y-[^"]*?)">\s*<Label[^>]*>(.*?)</Label>\s*<p[^>]*>(.*?)</p>\s*</div>',
        re.DOTALL
    )
    
    content = pattern.sub(repl, content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Refactored Switches in {filepath}")
