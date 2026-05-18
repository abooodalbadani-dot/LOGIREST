import json

def main():
    with open("scratch/lost_logic_analysis.json", "r", encoding="utf-8") as f:
        data = json.load(f)
        
    # Sort files by the count of potential lost lines in descending order
    data.sort(key=lambda x: x['lost_count'], reverse=True)
    
    print(f"## TOP {min(20, len(data))} FILES WITH LOST BUSINESS LOGIC / EXCLUSIVE WORK IN BACKUP\n")
    for item in data[:20]:
        rel = item['rel_path']
        count = item['lost_count']
        verdict = item['verdict']
        print(f"### `{rel}` ({count} potential lost lines)")
        print(f"**Verdict**: {verdict}")
        print("**Sample of lost code/styles:**")
        print("```typescript")
        for line in item['sample_losses']:
            print(f"- {line}")
        print("```")
        print("-" * 40)

if __name__ == "__main__":
    main()
