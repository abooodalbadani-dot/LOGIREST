import os
import re

directories = [
    'apps/web/src/app/[locale]/(app)/master-data',
]

files_to_check = []
for directory in directories:
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('ListClient.tsx'):
                files_to_check.append(os.path.join(root, file))

for filepath in files_to_check:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Find the filters block. It usually starts with filters={ and ends with }
    # Inside, there's <div className="flex flex-wrap...
    # It contains an Input with a placeholder.
    
    def repl(match):
        placeholder_str = match.group(1)
        # return the new strict layout
        return (
            'filters={\n'
            '          <div className="relative w-full">\n'
            f'            <Input\n'
            f'              placeholder={{{placeholder_str}}}\n'
            '              value={search}\n'
            '              onChange={(e) => setSearch(e.target.value)}\n'
            '              className="w-full h-10 pr-10 pl-4 bg-transparent border border-gray-200 dark:border-neutral-800 rounded-md focus:ring-1 focus:ring-brand-gold focus:border-brand-gold outline-none text-text-main dark:text-white"\n'
            '            />\n'
            '            <Search className="absolute right-3 top-2.5 text-gray-400 w-4 h-4" />\n'
            '          </div>\n'
            '        }'
        )

    # We match filters={ ... placeholder={something} ... }
    # Being careful to just match the standard generated ones
    pattern = re.compile(
        r'filters=\{\s*<div[^>]*flex[^>]*>.*?placeholder=\{([^}]+)\}.*?</Search>\s*</div>\s*</div>\s*</div>\s*\}',
        re.DOTALL
    )
    
    content = pattern.sub(repl, content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Refactored Filters in {filepath}")
