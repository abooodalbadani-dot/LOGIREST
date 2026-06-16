const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, '../apps/api/test');

// 1. Fix setup.ts
const setupPath = path.join(testDir, 'setup.ts');
if (fs.existsSync(setupPath)) {
  let content = fs.readFileSync(setupPath, 'utf8');
  // Normalize CRLF to LF for matching
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const target = `      await prisma.category.upsert({
        where: { name },
        update: {},
        create: { name },
      });`;
  const replacement = `      await prisma.category.upsert({
        where: { name },
        update: {},
        create: { name, code: name.toUpperCase().replace(/\\s+/g, '-') },
      });`;
  if (normalizedContent.includes(target)) {
    const updatedNormalized = normalizedContent.replace(target, replacement);
    // Put back CRLF if original file had CRLF
    const finalContent = content.includes('\r\n') ? updatedNormalized.replace(/\n/g, '\r\n') : updatedNormalized;
    fs.writeFileSync(setupPath, finalContent, 'utf8');
    console.log(`Updated setup.ts`);
  } else {
    console.warn(`Target not found in setup.ts even after normalization`);
  }
}
