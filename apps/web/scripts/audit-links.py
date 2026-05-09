import os
import re
import json

# Configuration
SRC_ROOT = "e:\\Kitchen‑Store Inventory System\\apps\\web\\src"
LOCALIZED_NAV_IMPORT = "@/i18n/navigation"

# Regex patterns
# Ignore lines starting with // or inside /* */ (simple check)
IMPORT_RE = re.compile(r'^(?!\s*//)\s*import\s+{?([^}]+)}?\s+from\s+[\'"]([^\'"]+)[\'"]', re.MULTILINE)
# Catch <Link href="/..." or <Link href={`/...` or <Link href={'/...'
LINK_HREF_RE = re.compile(r'<Link\s+[^>]*href={?([`"\']/[^`"\'>}]+[`"\'])}?[^>]*>')
# Catch router.push(any string or template literal)
ROUTER_CALL_RE = re.compile(r'(\w+)\.(push|replace)\(\s*([`"\'][^`"\')]+[`"\'])\s*[,)]')
REDIRECT_CALL_RE = re.compile(r'(?!\s*//)\s*redirect\(\s*([`"\'][^`"\')]+[`"\'])\s*[,)]')

results = {
    "violations": [],
    "summary": {
        "files_scanned": 0,
        "raw_link_imports": 0,
        "raw_router_imports": 0,
        "potential_unlocalized_links": 0,
        "hardcoded_locale_paths": 0
    }
}

def audit_file(file_path):
    rel_path = os.path.relpath(file_path, SRC_ROOT)
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    results["summary"]["files_scanned"] += 1
    
    # 1. Analyze Imports
    nav_sources = {} # component/function -> source
    raw_imports = IMPORT_RE.findall(content)
    for names, source in raw_imports:
        names_list = [n.strip() for n in names.split(',')]
        for name in names_list:
            # Handle aliases: "useRouter as guardedRouter"
            actual_name = name
            if ' as ' in name:
                parts = name.split(' as ')
                actual_name = parts[1].strip()
            
            nav_sources[actual_name] = source
            
            if source == 'next/link':
                results["summary"]["raw_link_imports"] += 1
            if source == 'next/navigation' and actual_name in ['useRouter', 'redirect']:
                results["summary"]["raw_router_imports"] += 1

    # 2. Check Link usages
    links = LINK_HREF_RE.findall(content)
    for href_val in links:
        href = href_val.strip('`"\'')
        # Check for hardcoded locale
        if href.startswith('/en/') or href.startswith('/ar/'):
            results["violations"].append({
                "file": rel_path,
                "type": "HARDCODED_LOCALE",
                "content": f'href={href_val}',
                "severity": "HIGH"
            })
            results["summary"]["hardcoded_locale_paths"] += 1
        
        # Check if Link is from next/link
        if nav_sources.get('Link') == 'next/link':
             results["violations"].append({
                "file": rel_path,
                "type": "RAW_LINK_USAGE",
                "content": f'Link href={href_val}',
                "severity": "MEDIUM",
                "message": "Uses next/link instead of @/i18n/navigation"
            })
             results["summary"]["potential_unlocalized_links"] += 1

    # 3. Check Router usages
    router_calls = ROUTER_CALL_RE.findall(content)
    for router_var, method, href_val in router_calls:
        source = nav_sources.get(router_var)
        # If we can't find where the var came from, it might be passed as a prop or defined elsewhere.
        # But if we know it came from next/navigation, it's a violation.
        if source == 'next/navigation':
            results["violations"].append({
                "file": rel_path,
                "type": "RAW_ROUTER_USAGE",
                "content": f'{router_var}.{method}({href_val})',
                "severity": "HIGH",
                "message": f"Uses {router_var} from next/navigation instead of @/i18n/navigation"
            })
            results["summary"]["potential_unlocalized_links"] += 1

    # 4. Check Redirect usages
    redirect_calls = REDIRECT_CALL_RE.findall(content)
    for href_val in redirect_calls:
        if nav_sources.get('redirect') == 'next/navigation':
             results["violations"].append({
                "file": rel_path,
                "type": "RAW_REDIRECT_USAGE",
                "content": f'redirect({href_val})',
                "severity": "HIGH"
            })
             results["summary"]["potential_unlocalized_links"] += 1

def main():
    for root, dirs, files in os.walk(SRC_ROOT):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                audit_file(os.path.join(root, file))
    
    # Save results
    output_path = "e:\\Kitchen‑Store Inventory System\\apps\\web\\audit\\link-integrity-results.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    
    print(f"Audit complete. Scanned {results['summary']['files_scanned']} files.")
    print(f"Found {len(results['violations'])} violations.")
    try:
        print(f"Results saved to {output_path}")
    except UnicodeEncodeError:
        print("Results saved to a JSON file (path contains special characters).")


if __name__ == "__main__":
    main()
