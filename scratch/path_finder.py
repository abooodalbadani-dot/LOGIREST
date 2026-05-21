import json

def main():
    with open('graphify-out/graph.json') as f:
        g = json.load(f)
    
    # build adjacency list
    adj = {}
    edge_info = {}
    for e in g['links']:
        u, v = e['source'], e['target']
        rel = e.get('type', 'rel')
        adj.setdefault(u, []).append(v)
        adj.setdefault(v, []).append(u)
        edge_info[(u, v)] = rel
        edge_info[(v, u)] = rel + " (reverse)"
        
    def bfs(start, target):
        queue = [[start]]
        visited = {start}
        while queue:
            path = queue.pop(0)
            curr = path[-1]
            if curr == target:
                return path
            for nxt in adj.get(curr, []):
                if nxt not in visited:
                    visited.add(nxt)
                    queue.append(path + [nxt])
        return None

    path1 = bfs('apiClient', 'useAuth')
    path2 = bfs('apiClient', 'ActionGuard')
    path3 = bfs('useAuth', 'ActionGuard')
    
    print("Path from apiClient to useAuth:")
    if path1:
        for i in range(len(path1) - 1):
            u, v = path1[i], path1[i+1]
            print(f"  {u} --[{edge_info.get((u,v))}]--> {v}")
    else:
        print("  No path found.")
        
    print("\nPath from apiClient to ActionGuard:")
    if path2:
        for i in range(len(path2) - 1):
            u, v = path2[i], path2[i+1]
            print(f"  {u} --[{edge_info.get((u,v))}]--> {v}")
    else:
        print("  No path found.")

    print("\nPath from useAuth to ActionGuard:")
    if path3:
        for i in range(len(path3) - 1):
            u, v = path3[i], path3[i+1]
            print(f"  {u} --[{edge_info.get((u,v))}]--> {v}")
    else:
        print("  No path found.")

if __name__ == "__main__":
    main()
