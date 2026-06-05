const fs = require('fs');

const file = 'apps/web/src/app/[locale]/(app)/master-data/departments/DepartmentFormClient.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix branchItems
content = content.replace(/const filteredWarehouses = warehouses\.filter\(w => !selectedBranchId \|\| w\.branch_id === selectedBranchId\);\r?\n\s+const branchItems = useMemo\(\(\) => \{\r?\n\s+return branches\.map\(\(b\) => \(\{\r?\n\s+id: b\.id,\r?\n\s+name: `\$\{b\.code\} — \$\{b\.name \|\| ''\}`,\r?\n\s+\}\)\);\r?\n\s+\}, \[branches, locale\]\);\r?\n\s+const warehouseItems = useMemo\(\(\) => \{  const warehouseItems = useMemo\(\(\) => \{\r?\n\s+return filteredWarehouses\.map\(\(w\) => \(\{\r?\n\s+id: w\.id,\r?\n\s+name: `\$\{w\.code\} — \$\{w\.name \|\| ''\}`,\r?\n\s+\}\)\);\r?\n\s+\}, \[filteredWarehouses, locale\]\);/g, 
`const filteredWarehouses = warehouses.filter(w => !selectedBranchId || w.branch_id === selectedBranchId);

  const branchItems = useMemo(() => {
    return branches.map((b) => ({
      id: b.id,
      name: \`\${b.code} — \${b.name || ''}\`,
    }));
  }, [branches, locale]);

  const warehouseItems = useMemo(() => {
    return filteredWarehouses.map((w) => ({
      id: w.id,
      name: \`\${w.code} — \${w.name || ''}\`,
    }));
  }, [filteredWarehouses, locale]);`);

fs.writeFileSync(file, content);
console.log('Fixed syntax in DepartmentFormClient.tsx');
