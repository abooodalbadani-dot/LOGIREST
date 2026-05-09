import os
from pathlib import Path

REPO_ROOT = Path(r"e:\Kitchen‑Store Inventory System")
APP_DIR = REPO_ROOT / "apps" / "web" / "src" / "app"
ROUTE_GROUPS = ("(app)", "(auth)", "(operations)", "(procurement)", "(master-data)")
LOCALE_SEGMENT = "[locale]"

def normalize_route(rel_path: str) -> str:
    parts = Path(rel_path).parts
    if parts and parts[0] == LOCALE_SEGMENT:
        parts = parts[1:]
    parts = tuple(p for p in parts if p not in ROUTE_GROUPS)
    parts = tuple(p for p in parts if p != "page.tsx")
    if not parts:
        return "/"
    segments = []
    for p in parts:
        if p.startswith("[") and p.endswith("]"):
            inner = p[1:-1]
            if inner == "id":
                segments.append(":id")
            else:
                segments.append(f":{inner}")
        else:
            segments.append(p)
    route = "/" + "/".join(segments)
    return route

page_files = sorted(APP_DIR.rglob("page.tsx"))
for pf in page_files:
    rel = pf.relative_to(APP_DIR)
    route = normalize_route(str(rel).replace("\\", "/"))
    if "purchase-requests" in route:
        print(f"File: {rel} -> Route: {route}")
