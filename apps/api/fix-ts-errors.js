const fs = require('fs');

// Fix hash.util.ts
const hashFile = 'src/common/hash.util.ts';
let hashContent = fs.readFileSync(hashFile, 'utf8');
hashContent = hashContent.replace(
  /typeof value\.toFixed === 'function'/g,
  "typeof (value as any).toFixed === 'function'"
);
fs.writeFileSync(hashFile, hashContent);

// Fix warehouses-direct.controller.ts
const whFile = 'src/modules/master-data/warehouses/warehouses-direct.controller.ts';
let whContent = fs.readFileSync(whFile, 'utf8');
whContent = whContent.replace(
  /let code = body\.code;/g,
  "let code = body.code as string;"
).replace(
  /name: body\.name,/g,
  "name: body.name as string,"
).replace(
  /code: body\.code,/g,
  "code: body.code as string,"
).replace(
  /branchId: body\.branchId,/g,
  "branchId: body.branchId as string,"
);
fs.writeFileSync(whFile, whContent);

// Fix search.controller.spec.ts
const specFile = 'src/modules/search/search.controller.spec.ts';
let specContent = fs.readFileSync(specFile, 'utf8');
specContent = specContent.replace(
  /\{\} as Record<string, unknown>/g,
  "{} as unknown as Request"
);
fs.writeFileSync(specFile, specContent);
