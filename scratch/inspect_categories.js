const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, '../apps/api/test');
const files = fs.readdirSync(testDir);

for (const file of files) {
  if (!file.endsWith('.ts')) continue;
  const filePath = path.join(testDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('prisma.category.create')) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('prisma.category.create')) {
        console.log(`--- ${file}:${i + 1} ---`);
        console.log(lines.slice(i, i + 5).join('\n'));
      }
    }
  } else if (content.includes('prisma.category.upsert')) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('prisma.category.upsert')) {
        console.log(`--- ${file}:${i + 1} ---`);
        console.log(lines.slice(i, i + 7).join('\n'));
      }
    }
  }
}
