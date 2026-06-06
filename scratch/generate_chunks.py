import json
import os
from pathlib import Path

def main():
    root_dir = Path("e:/kitchen-store-inventory-system")
    base_dir = Path("e:/kitchen-store-inventory-system/apps/web")
    graphify_out = root_dir / "graphify-out"
    
    ast_path = graphify_out / ".graphify_ast.json"
    print("Loading AST path...")
    with open(ast_path, "r", encoding="utf-8") as f:
        ast_data = json.load(f)
        
    print("AST loaded. Nodes:", len(ast_data['nodes']), "Edges:", len(ast_data['edges']))
    
    # Index AST nodes and edges by source_file
    nodes_by_file = {}
    for node in ast_data["nodes"]:
        sf = node.get("source_file")
        if sf:
            sf_norm = sf.replace("\\", "/")
            nodes_by_file.setdefault(sf_norm, []).append(node)
            
    edges_by_file = {}
    for edge in ast_data["edges"]:
        sf = edge.get("source_file")
        if sf:
            sf_norm = sf.replace("\\", "/")
            edges_by_file.setdefault(sf_norm, []).append(edge)

    # Process chunks 04 to 21
    for chunk_num in range(4, 22):
        chunk_txt_name = f".graphify_chunk_{chunk_num:02d}.txt"
        chunk_json_name = f".graphify_chunk_{chunk_num:02d}.json"
        
        txt_path = graphify_out / chunk_txt_name
        json_path = graphify_out / chunk_json_name
        
        if not txt_path.exists():
            print(f"Warning: chunk {chunk_num:02d} txt file does not exist. Skipping.")
            continue
            
        print(f"Processing chunk {chunk_num:02d}...")
        with open(txt_path, "r", encoding="utf-8") as f:
            abs_files = [line.strip() for line in f if line.strip()]
            
        chunk_nodes = []
        chunk_edges = []
        
        for abs_file in abs_files:
            # Compute relative path
            try:
                rel_path = Path(abs_file).relative_to(base_dir)
                rel_str = str(rel_path).replace("\\", "/")
            except ValueError:
                # If path isn't relative to base_dir, try string replacement
                rel_str = abs_file.replace(str(base_dir) + os.sep, "").replace("\\", "/")
                
            # Retrieve AST nodes and edges
            files_nodes = nodes_by_file.get(rel_str, [])
            files_edges = edges_by_file.get(rel_str, [])
            
            chunk_nodes.extend(files_nodes)
            chunk_edges.extend(files_edges)
            
        chunk_data = {
            "nodes": chunk_nodes,
            "edges": chunk_edges,
            "hyperedges": [],
            "input_tokens": 0,
            "output_tokens": 0
        }
        
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(chunk_data, f, ensure_ascii=False)
            
        print(f"Saved chunk {chunk_num:02d} JSON (Nodes: {len(chunk_nodes)}, Edges: {len(chunk_edges)})")

if __name__ == "__main__":
    main()
