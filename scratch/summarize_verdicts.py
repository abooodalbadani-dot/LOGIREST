import json

def main():
    with open("scratch/diff_analysis_result.json", "r", encoding="utf-8") as f:
        data = json.load(f)
        
    details = data['details']
    
    print("## MODIFIED FILES AND VERDICTS\n")
    print("| File Path | Status | Verdict | Backup Features | Active Features |")
    print("|---|---|---|---|---|")
    
    for item in details:
        rel = item['rel_path']
        status = item['status']
        verdict = item['verdict']
        a_feats = ", ".join(item.get('a_features', []))
        b_feats = ", ".join(item.get('b_features', []))
        # shorten path for table
        short_rel = rel.replace("[locale]/(app)/", "").replace("(operations)/", "").replace("(procurement)/", "")
        print(f"| `{short_rel}` | {status} | {verdict} | {a_feats} | {b_feats} |")

if __name__ == "__main__":
    main()
