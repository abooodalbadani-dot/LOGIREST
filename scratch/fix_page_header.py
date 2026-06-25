import os

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content.replace('actions={', 'children={').replace('actions=', 'children=')
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")

def main():
    files_to_fix = [
        r"c:\kitchen-store-inventory-system\apps\web\src\app\[locale]\(app)\(operations)\stocktake\[id]\approve\StocktakeApproveClient.tsx",
        r"c:\kitchen-store-inventory-system\apps\web\src\app\[locale]\(app)\(operations)\transfers\[id]\dispute\TransferDisputeClient.tsx",
        r"c:\kitchen-store-inventory-system\apps\web\src\app\[locale]\(app)\(operations)\transfers\[id]\TransferViewer.tsx",
        r"c:\kitchen-store-inventory-system\apps\web\src\features\operations\components\transfer-form.tsx"
    ]
    for filepath in files_to_fix:
        if os.path.exists(filepath):
            process_file(filepath)

if __name__ == '__main__':
    main()
