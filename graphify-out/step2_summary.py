import json
from pathlib import Path
from collections import Counter
import sys

detect_file = Path('graphify-out/.graphify_detect.json')
if not detect_file.exists():
    print("Error: detect file does not exist")
    sys.exit(1)

with open(detect_file, 'r', encoding='utf-8') as f:
    detect = json.load(f)

files = detect.get('files', {})
total_words = detect.get('total_words', 0)
total_files = detect.get('total_files', 0)
skipped = detect.get('skipped_sensitive', [])

print(f"Corpus: {total_files:,} files · ~{total_words:,} words")

# Print categories
extensions = {}
for cat, paths in files.items():
    if not paths:
        continue
    # Group by extensions
    exts = Counter([Path(p).suffix.lower() for p in paths if Path(p).suffix])
    ext_str = ", ".join([f"{k}" for k, v in exts.most_common(5)])
    print(f"  {cat}:     {len(paths)} files ({ext_str})")

if skipped:
    print(f"Skipped sensitive files: {len(skipped)}")

# Check threshold
if total_words > 2000000 or total_files > 200:
    print("WARNING: LARGE_CORPUS")
    # find top 5 subdirectories by file count
    all_paths = [Path(p) for paths in files.values() for p in paths]
    subdirs = Counter()
    for p in all_paths:
        parts = p.parts
        # find top-level relative subdirectories
        if len(parts) > 1:
            # Check if absolute path or relative
            # Since paths might be absolute, let's look for parts after E:\Kitchen‑Store Inventory System
            # Wait, let's find the relative path
            try:
                rel = p.relative_to(Path('.').resolve())
                if len(rel.parts) > 0:
                    subdirs[rel.parts[0]] += 1
            except ValueError:
                # Fallback if not under relative
                if len(parts) > 1:
                    subdirs[parts[1]] += 1
        else:
            subdirs['[root]'] += 1
    
    print("Top 5 subdirectories by file count:")
    for sd, count in subdirs.most_common(5):
        print(f"  {sd}/: {count} files")
else:
    print("PROCEED")
