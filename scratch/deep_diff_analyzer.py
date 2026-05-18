import json
import subprocess
import os

def run_git_diff(file_a, file_b):
    try:
        # run git diff between backup and active
        result = subprocess.run(
            ['git', 'diff', '--no-index', '-U1', file_a, file_b],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8'
        )
        return result.stdout
    except Exception as e:
        return str(e)

def analyze_individual_diffs():
    with open("scratch/diff_analysis_result.json", "r", encoding="utf-8") as f:
        data = json.load(f)
        
    details = data['details']
    summary_of_losses = []
    
    for item in details:
        if item['status'] != 'MODIFIED':
            continue
            
        rel = item['rel_path']
        file_a = os.path.join("scratch/app_backup", rel)
        file_b = os.path.join("apps/web/src/app", rel)
        
        diff_text = run_git_diff(file_a, file_b)
        
        # We want to search for lines in A (backup) that are deleted in B (active),
        # meaning they start with '-' in git diff output (which compares A -> B).
        # In a git diff A B, '-' lines are in A (backup) and '+' lines are in B (active).
        deleted_lines_in_active = []
        added_lines_in_active = []
        
        for line in diff_text.split('\n'):
            if line.startswith('-') and not line.startswith('---'):
                clean = line[1:].strip()
                if clean and not clean.startswith('//') and not clean.startswith('*'):
                    deleted_lines_in_active.append(clean)
            elif line.startswith('+') and not line.startswith('+++'):
                clean = line[1:].strip()
                if clean and not clean.startswith('//') and not clean.startswith('*'):
                    added_lines_in_active.append(clean)
                    
        # Filter out minor syntax or renaming differences (like nameAr -> name_ar)
        # to find significant chunks of business logic or styles lost
        significant_lost_lines = []
        for line in deleted_lines_in_active:
            # If the line is a simple camelCase vs snakeCase or minor tweak, skip
            is_simple_rename = False
            for active_line in added_lines_in_active:
                # If they are very similar or just have camel/snake case changes, ignore
                if line.replace('Ar', '_ar').replace('En', '_en').replace('sku', 'code') == active_line:
                    is_simple_rename = True
                    break
                if line.replace(' ', '') == active_line.replace(' ', ''):
                    is_simple_rename = True
                    break
            if not is_simple_rename and len(line) > 15:
                significant_lost_lines.append(line)
                
        if significant_lost_lines:
            summary_of_losses.append({
                'rel_path': rel,
                'lost_count': len(significant_lost_lines),
                'sample_losses': significant_lost_lines[:5],
                'verdict': item['verdict']
            })
            
    print(f"Found {len(summary_of_losses)} files with potential lost business logic or exclusive work in backup!")
    
    with open("scratch/lost_logic_analysis.json", "w", encoding="utf-8") as f:
        json.dump(summary_of_losses, f, indent=2)

if __name__ == "__main__":
    analyze_individual_diffs()
