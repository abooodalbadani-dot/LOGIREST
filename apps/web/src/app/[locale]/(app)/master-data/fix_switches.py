import os

def fix_switches():
    target_pattern = 'className="flex flex-row items-center justify-between w-full rounded-lg border'
    replacement = 'className="col-span-12 flex flex-row items-center justify-between w-full rounded-lg border'
    
    directory = 'apps/web/src/app/[locale]/(app)/master-data'
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('FormClient.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                if target_pattern in content:
                    new_content = content.replace(target_pattern, replacement)
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Fixed switches in {path}")

fix_switches()
