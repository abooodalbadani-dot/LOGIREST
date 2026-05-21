import json
from pathlib import Path

def main():
    ast_path = Path("e:/Kitchen‑Store Inventory System/graphify-out/.graphify_ast.json")
    with open(ast_path, "r", encoding="utf-8") as f:
        ast_data = json.load(f)
        
    source_files = sorted(list({n.get("source_file") for n in ast_data["nodes"] if n.get("source_file")}))
    print("Unique source_files in AST (first 30):")
    for sf in source_files[:30]:
        print(f"  {sf}")

if __name__ == "__main__":
    main()
