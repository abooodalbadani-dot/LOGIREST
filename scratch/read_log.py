import json

logs_path = r"C:\Users\DBi\.gemini\antigravity-ide\brain\8f2572ef-f9b7-4055-8afe-57178c0bcaaa\.system_generated\logs\transcript.jsonl"
with open(logs_path, "r", encoding="utf-8") as f:
    lines = [json.loads(line) for line in f]

target_lines = [l for l in lines if 140 <= l.get("step_index", 999) <= 184]
for l in target_lines:
    idx = l.get("step_index")
    typ = l.get("type")
    content = l.get("content", "")
    if content:
        content_snippet = content[:180].replace('\n', ' ')
    else:
        content_snippet = ""
    print(f"Step {idx}: {typ} - {content_snippet}")
    if "tool_calls" in l and l["tool_calls"]:
        for tc in l["tool_calls"]:
            print(f"  Tool Call: {tc.get('name')}")
