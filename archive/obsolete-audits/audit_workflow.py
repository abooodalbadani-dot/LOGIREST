import re

def audit_workflow():
    filepath = 'src/core/workflow/document-engine.ts'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Extract workflowMap
    # Matches 'TYPE': { pending: [...], locked: [...] }
    workflow_data = {}
    workflow_block_match = re.search(r'const workflowMap:.*?= \{(.*?)\n\};', content, re.DOTALL)
    if workflow_block_match:
        workflow_block = workflow_block_match.group(1)
        # Split by document type entry
        entries = re.finditer(r"'(\w+)': \{(.*?)\n\s{2}\}", workflow_block, re.DOTALL)
        for entry in entries:
            doc_type = entry.group(1)
            body = entry.group(2)
            # Find all strings in single quotes within this block
            statuses = set(re.findall(r"'([A-Z_]+)'", body))
            workflow_data[doc_type] = statuses

    # 2. Extract transitionMapV2
    transition_data = {}
    transition_block_match = re.search(r'const transitionMapV2:.*?= \{(.*?)\n\};', content, re.DOTALL)
    if transition_block_match:
        transition_block = transition_block_match.group(1)
        # Matches 'TYPE': { 'STATUS': { 'ACTION': { targetStatus: 'TARGET' } } }
        entries = re.finditer(r"'(\w+)': \{(.*?)\n\s{2}\}", transition_block, re.DOTALL)
        for entry in entries:
            doc_type = entry.group(1)
            body = entry.group(2)
            
            # Find all source statuses (keys in the first level of the object)
            source_statuses = re.findall(r"^\s{4}'([A-Z_]+)': \{", body, re.MULTILINE)
            # Find all target statuses
            target_statuses = re.findall(r"targetStatus: '([A-Z_]+)'", body)
            
            transition_data[doc_type] = set(source_statuses) | set(target_statuses)

    # 3. Compare
    mismatches = []
    all_types = set(workflow_data.keys()) | set(transition_data.keys())
    
    for doc_type in all_types:
        w_statuses = workflow_data.get(doc_type, set())
        t_statuses = transition_data.get(doc_type, set())
        
        # In workflowMap but not in transitionMapV2
        # (Status is defined but unreachable/unusable?)
        for s in w_statuses:
            if s not in t_statuses:
                # Some terminal statuses like CANCELLED might not have transitions OUT, 
                # but they should be TARGETS of some transition.
                mismatches.append(f"Document {doc_type}: Status '{s}' is in workflowMap but NEVER appears in transitionMapV2 (as source or target)")
        
        # In transitionMapV2 but not in workflowMap
        # (Status is used but not categorized as pending/locked/etc.)
        for s in t_statuses:
            if s not in w_statuses:
                mismatches.append(f"Document {doc_type}: Status '{s}' is used in transitionMapV2 but is MISSING from workflowMap categories")

    if not mismatches:
        print("Workflow Audit Passed: Maps are consistent.")
    else:
        print("Workflow Audit Failed:")
        for m in mismatches:
            print(f"  - {m}")

if __name__ == "__main__":
    audit_workflow()
