import os

directories = [
    'apps/web/src/app/[locale]/(app)/master-data',
]

for directory in directories:
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()

                if 'brand-gold' in content:
                    new_content = content.replace('brand-gold-hover', 'operational-cyan/90').replace('brand-gold', 'operational-cyan')
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Fixed colors in {filepath}")
