import os

target_strings = ["أحمد المنصور", "احمد المنصور", "Ahmed Al-Mansour", "Mansour", "المنصور"]
search_dir = r"e:\Kitchen‑Store Inventory System\apps\web"

def search_files(dir_path):
    for root, dirs, files in os.walk(dir_path):
        if ".next" in root or "node_modules" in root or ".turbo" in root:
            continue
        for file in files:
            if file.endswith((".ts", ".tsx", ".json", ".js", ".jsx", ".md")):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        for target in target_strings:
                            if target in content:
                                print(f"Found '{target}' in {file_path}")
                except Exception as e:
                    # print(f"Error reading {file_path}: {e}")
                    pass

if __name__ == "__main__":
    search_files(search_dir)
    # Also search messages directory
    search_files(r"e:\Kitchen‑Store Inventory System\apps\web\messages")
