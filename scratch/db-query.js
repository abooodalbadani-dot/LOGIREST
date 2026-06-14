const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const barcode = await prisma.barcodeMapping.findUnique({
    where: { id: '359339f1-19bb-4051-9e66-20081339f76a' }
  });
  console.log('Barcode mapping:', JSON.stringify(barcode, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
