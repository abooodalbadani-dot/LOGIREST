import json
from pathlib import Path

def main():
    detect_path = Path("e:/kitchen-store-inventory-system/graphify-out/.graphify_detect.json")
    with open(detect_path, "r", encoding="utf-8") as f:
        detect_data = json.load(f)
    
    files = []
    for category, file_list in detect_data.get("files", {}).items():
        files.extend(file_list)
        
    print(f"Total files: {len(files)}")
    non_web = [f for f in files if "apps\\web" not in f]
    print(f"Non-web files: {len(non_web)}")
    if non_web:
        for f in non_web[:10]:
            print(f"  {f}")
            
if __name__ == "__main__":
    main()
