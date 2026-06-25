const fs = require('fs');

let content = fs.readFileSync('apps/api/src/modules/pdf/pdf-generator.service.ts', 'utf8');

// 1. Add imports
if (!content.includes('arabic-reshaper')) {
  content = content.replace(
    "import { otantikBase64Logo } from './logo-base64';",
    "import { otantikBase64Logo } from './logo-base64';\nimport arabicReshaper from 'arabic-reshaper';\nimport bidi from 'bidi-js';\n\nconst bidiEngine = bidi();\nconst formatArabic = (text: string) => {\n  if (!text) return text;\n  return bidiEngine.getReorderedString(arabicReshaper.reshape(text));\n};"
  );
}

// 2. DocumentTitleMap PROCUREMENT_GRN
if (!content.includes("PROCUREMENT_GRN: 'سند استلام بضاعة'")) {
  content = content.replace(
    "GOODS_RECEIVED_NOTE: 'سند استلام بضاعة',",
    "GOODS_RECEIVED_NOTE: 'سند استلام بضاعة',\n    PROCUREMENT_GRN: 'سند استلام بضاعة',"
  );
  content = content.replace(
    "GOODS_RECEIVED_NOTE: 'Goods Receipt',",
    "GOODS_RECEIVED_NOTE: 'Goods Receipt',\n    PROCUREMENT_GRN: 'Goods Receipt',"
  );
}

// 3. getDisplayTitle
content = content.replace(
  /const rawTitle = map\[documentType\.toUpperCase\(\)\] \|\| documentType;\n\s+return rawTitle\.replace\(\/_\/g, ' '\);/g,
  "const rawTitle = map[documentType.toUpperCase()] || documentType;\n    const title = rawTitle.replace(/_/g, ' ');\n    return locale === 'ar' ? formatArabic(title) : title;"
);

// 4. formatCurrency
content = content.replace(
  /private formatCurrency\(value: number, currencyCode: string\): string \{\n\s+return `\$\{Number\(value\)\.toFixed\(2\)\} \$\{currencyCode\}`;\n\s+\}/g,
  "private formatCurrency(value: number, currencyCode?: string): string {\n    if (!currencyCode) return `${Number(value).toFixed(2)}`;\n    return `${Number(value).toFixed(2)} ${currencyCode}`;\n  }"
);

// 5. Stocktake Total Variance Value Currency Fix
content = content.replace(
  /doc\.text\(this\.formatCurrency\(totalVarianceValue, 'SAR'\), 485, y, \{/g,
  "doc.text(this.formatCurrency(totalVarianceValue, ''), 485, y, {"
);

// 6. Fix static Arabic texts
const arabicRegex = /doc\.text\((['"][^'"]*[\u0600-\u06FF]+[^'"]*['"]),\s*([^,]+),\s*([^,)]+)(?:,\s*\{([^}]*)\})?\)/g;

content = content.replace(arabicRegex, (match, textStr, x, y, optionsStr) => {
  if (optionsStr) {
    let newOptions = optionsStr.replace(/direction\s*:\s*['"]rtl['"]\s*,?/g, '').trim();
    if (newOptions.endsWith(',')) newOptions = newOptions.slice(0, -1).trim();
    if (newOptions === '') {
      return `doc.text(formatArabic(${textStr}), ${x}, ${y})`;
    } else {
      return `doc.text(formatArabic(${textStr}), ${x}, ${y}, { ${newOptions} })`;
    }
  } else {
    return `doc.text(formatArabic(${textStr}), ${x}, ${y})`;
  }
});

// Fix dynamic itemName
content = content.replace(/doc\.text\(itemName,\s*([^,]+),\s*([^,]+),\s*\{\s*([^}]+)\s*\}\);/g, (match, x, y, optionsStr) => {
  let newOptions = optionsStr.replace(/direction\s*:\s*isAr \? ['"]rtl['"] : ['"]ltr['"]\s*,?/g, '').trim();
  if (newOptions.endsWith(',')) newOptions = newOptions.slice(0, -1).trim();
  return `doc.text(isAr ? formatArabic(itemName) : itemName, ${x}, ${y}, { ${newOptions} });`;
});

// Fix direction IN/OUT for Adjustment
content = content.replace(/doc\.text\(dirAr,\s*([^,]+),\s*([^,]+),\s*\{\s*([^}]+)\s*\}\);/g, (match, x, y, optionsStr) => {
  let newOptions = optionsStr.replace(/direction\s*:\s*['"]rtl['"]\s*,?/g, '').trim();
  if (newOptions.endsWith(',')) newOptions = newOptions.slice(0, -1).trim();
  return `doc.text(formatArabic(dirAr), ${x}, ${y}, { ${newOptions} });`;
});

// Title & Document Info displayTitle
content = content.replace(/doc\.text\(displayTitle,\s*160,\s*40,\s*\{\s*([^}]+)\s*\}\);/g, (match, optionsStr) => {
  let newOptions = optionsStr.replace(/direction\s*:\s*isAr \? ['"]rtl['"] : ['"]ltr['"]\s*,?/g, '').trim();
  if (newOptions.endsWith(',')) newOptions = newOptions.slice(0, -1).trim();
  return `doc.text(displayTitle, 160, 40, { ${newOptions} });`;
});

// GRN Details & Headers
content = content.replace(/doc\.text\('SUPPLIER',\s*40,\s*y\);/g, "doc.text('SUPPLIER NAME', 40, y);");
content = content.replace(/doc\.text\(`Supplier:\s*\$\{grn\.purchaseOrder\?\.supplier\?\.name\s*\|\|\s*'—'\}`,\s*40,\s*y\);/g, "doc.text(`Supplier Name: ${grn.purchaseOrder?.supplier?.name || '—'}`, 40, y);");

content = content.replace(/doc\.text\(`PO Ref:\s*\$\{grn\.purchaseOrder\?\.poNumber\s*\|\|\s*'—'\}`,\s*160,\s*95,\s*\{\s*align:\s*'right',\s*\}\);/g, "doc.text(`PO Ref: ${grn.purchaseOrder?.poNumber || '—'}`, 160, 95, {\n            align: 'right',\n          });\n          if ((grn as any).postedAt) {\n            doc.text(`Posted At: ${this.formatDate((grn as any).postedAt)}`, 160, 110, { align: 'right' });\n          } else {\n            doc.text(`Posted At: —`, 160, 110, { align: 'right' });\n          }");

content = content.replace(/doc\.text\(`Status:\s*\$\{grn\.status\}`,\s*160,\s*110,\s*\{\s*align:\s*'right'\s*\}\);/g, "doc.text(`Status: ${grn.status}`, 160, 125, { align: 'right' });");
content = content.replace(/\.moveTo\(40, 140\)/g, ".moveTo(40, 155)");
content = content.replace(/\.lineTo\(555, 140\)/g, ".lineTo(555, 155)");
content = content.replace(/let y = 155;/g, "let y = 170;");

fs.writeFileSync('apps/api/src/modules/pdf/pdf-generator.service.ts', content);
console.log('Patched pdf-generator.service.ts');
