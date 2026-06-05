const fs = require('fs');

const file = 'apps/web/src/app/[locale]/(app)/master-data/departments/DepartmentFormClient.tsx';
let content = fs.readFileSync(file, 'utf8');

// I'll just find the line "const filteredWarehouses = warehouses.filter(w => !selectedBranchId || w.branch_id === selectedBranchId);"
// and replace everything after it until the next useMemo with the correct code.
const matchStart = 'const filteredWarehouses = warehouses.filter(w => !selectedBranchId || w.branch_id === selectedBranchId);';
const matchEnd = '}, [filteredWarehouses, locale]);';

const startIndex = content.indexOf(matchStart);
const endIndex = content.indexOf(matchEnd, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `const filteredWarehouses = warehouses.filter(w => !selectedBranchId || w.branch_id === selectedBranchId);

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
  }, [filteredWarehouses, locale]);`;
  
  content = content.slice(0, startIndex) + replacement + content.slice(endIndex + matchEnd.length);
  fs.writeFileSync(file, content);
  console.log('Fixed DepartmentFormClient.tsx successfully');
} else {
  console.log('Could not find match');
}
