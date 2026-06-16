import os
import glob

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = content
        new_content = new_content.replace('primary-gradient', 'bg-brand-gold hover:bg-brand-gold-hover text-white transition-colors')
        new_content = new_content.replace('bg-surface-container-lowest', 'bg-white dark:bg-card-dark border border-gray-200 dark:border-neutral-800 shadow-sm')
        new_content = new_content.replace('bg-surface-container-low', 'bg-white dark:bg-card-dark border border-gray-200 dark:border-neutral-800 shadow-sm')
        new_content = new_content.replace('shadow-lg', 'shadow-sm')
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8', newline='') as f:
                f.write(new_content)
            print(f"Updated: {filepath}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

if __name__ == '__main__':
    src_dir = os.path.join('c:\\kitchen-store-inventory-system', 'apps', 'web', 'src')
    files = glob.glob(os.path.join(src_dir, '**', '*.tsx'), recursive=True)
    files.extend(glob.glob(os.path.join(src_dir, '**', '*.ts'), recursive=True))
    
    for f in files:
        replace_in_file(f)
    print("Batch replacement complete.")
