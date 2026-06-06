import json
from pathlib import Path

def main():
    root_dir = Path("e:/kitchen-store-inventory-system")
    base_dir = Path("e:/kitchen-store-inventory-system/apps/web")
    graphify_out = root_dir / "graphify-out"
    
    ast_path = graphify_out / ".graphify_ast.json"
    with open(ast_path, "r", encoding="utf-8") as f:
        ast_data = json.load(f)
        
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

    # Chunk 22 files
    txt_path = graphify_out / ".graphify_chunk_22.txt"
    with open(txt_path, "r", encoding="utf-8") as f:
        abs_files = [line.strip() for line in f if line.strip()]
        
    chunk_nodes = []
    chunk_edges = []
    
    for abs_file in abs_files:
        rel_path = Path(abs_file).relative_to(base_dir)
        rel_str = str(rel_path).replace("\\", "/")
        
        # If it's a code file, grab AST info
        if rel_str.endswith(".ts") or rel_str.endswith(".tsx"):
            files_nodes = nodes_by_file.get(rel_str, [])
            files_edges = edges_by_file.get(rel_str, [])
            chunk_nodes.extend(files_nodes)
            chunk_edges.extend(files_edges)
        elif rel_str.endswith(".svg"):
            # Add semantic node for image asset
            node_id = rel_str.replace("/", "_").replace(".", "_").lower()
            label = "Favicon Asset" if "favicon" in rel_str else "Icon Asset"
            image_node = {
                "id": node_id,
                "label": label,
                "file_type": "image",
                "source_file": "apps/web/" + rel_str,
                "source_location": None,
                "source_url": None,
                "captured_at": None,
                "author": None,
                "contributor": None
            }
            chunk_nodes.append(image_node)
            
            # Let's link it conceptually to root layout if it exists
            # We know layout.tsx represents the root layout
            layout_node_id = "locale_layout_tsx"
            # Add an edge
            image_edge = {
                "source": node_id,
                "target": layout_node_id,
                "relation": "conceptually_related_to",
                "confidence": "INFERRED",
                "confidence_score": 0.85,
                "source_file": "apps/web/" + rel_str,
                "source_location": None,
                "weight": 0.5
            }
            chunk_edges.append(image_edge)

    # Also let's look at the FEFO lot allocation utility in utils/fefo.ts and link it to the frontend form.
    # From chunk_nodes let's find if fefo nodes exist.
    # Let's add a conceptually related edge between fefo utility and layout/allocator components if needed.
    
    chunk_data = {
        "nodes": chunk_nodes,
        "edges": chunk_edges,
        "hyperedges": [],
        "input_tokens": 0,
        "output_tokens": 0
    }
    
    json_path = graphify_out / ".graphify_chunk_22.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(chunk_data, f, ensure_ascii=False)
        
    print(f"Saved chunk 22 JSON: Nodes {len(chunk_nodes)}, Edges {len(chunk_edges)}")

if __name__ == "__main__":
    main()
