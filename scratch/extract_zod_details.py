import re

log_path = r"C:\Users\DBi\.gemini\antigravity-ide\brain\7ee4bdb6-6382-42a8-ae68-2e4a80b653b7\.system_generated\tasks\task-137.log"

with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
    log_content = f.read()

# Find all blocks of [BROWSER error] [Zod Parsing Error] or [Zod Error]
# Let's find matches and print the error stack
matches = re.finditer(r"\[BROWSER error\] (\[Zod Error\]|\[Zod Parsing Error\])[\s\S]*?\}\}", log_content)

printed_endpoints = set()

for match in matches:
    block = match.group(0)
    # Extract endpoint name
    endpoint_match = re.search(r"for GET (\S+)", block)
    if endpoint_match:
        endpoint = endpoint_match.group(1)
        # Simplify the endpoint (e.g. replace UUIDs with :id)
        endpoint_clean = re.sub(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", ":id", endpoint)
        endpoint_clean = endpoint_clean.split("?")[0]
        if endpoint_clean not in printed_endpoints:
            printed_endpoints.add(endpoint_clean)
            print("="*80)
            print(f"Endpoint: {endpoint_clean}")
            print(block[:1500]) # Print first 1500 chars of the error block
            print("="*80)
            print("\n")
