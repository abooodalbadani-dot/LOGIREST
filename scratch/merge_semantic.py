import json
import glob
from pathlib import Path
from graphify.cache import save_semantic_cache

def main():
    root_dir = Path("e:/kitchen-store-inventory-system")
    graphify_out = root_dir / "graphify-out"
    
    chunks = sorted(glob.glob(str(graphify_out / ".graphify_chunk_*.json")))
    print(f"Found {len(chunks)} chunk files.")
    
    all_nodes, all_edges, all_hyperedges = [], [], []
    total_in, total_out = 0, 0
    
    for c in chunks:
        d = json.loads(Path(c).read_text(encoding="utf-8"))
        all_nodes += d.get('nodes', [])
        all_edges += d.get('edges', [])
        all_hyperedges += d.get('hyperedges', [])
        total_in += d.get('input_tokens', 0)
        total_out += d.get('output_tokens', 0)
        
    semantic_new = {
        'nodes': all_nodes,
        'edges': all_edges,
        'hyperedges': all_hyperedges,
        'input_tokens': total_in,
        'output_tokens': total_out,
    }
    
    # Save semantic new
    new_path = graphify_out / ".graphify_semantic_new.json"
    new_path.write_text(json.dumps(semantic_new, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Merged into {new_path.name}: {len(all_nodes)} nodes, {len(all_edges)} edges")
    
    # Save to semantic cache
    saved = save_semantic_cache(all_nodes, all_edges, all_hyperedges)
    print(f"Cached {saved} files.")
    
    # Since we have no separate cached files to merge (we generated/loaded everything in chunks),
    # we can just write the merged output directly to .graphify_semantic.json
    semantic_path = graphify_out / ".graphify_semantic.json"
    
    # Dedup nodes by id
    seen = set()
    deduped_nodes = []
    for n in all_nodes:
        if n['id'] not in seen:
            seen.add(n['id'])
            deduped_nodes.append(n)
            
    final_semantic = {
        'nodes': deduped_nodes,
        'edges': all_edges,
        'hyperedges': all_hyperedges,
        'input_tokens': total_in,
        'output_tokens': total_out
    }
    
    semantic_path.write_text(json.dumps(final_semantic, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Saved {semantic_path.name} with {len(deduped_nodes)} deduped nodes, {len(all_edges)} edges.")

if __name__ == "__main__":
    main()
