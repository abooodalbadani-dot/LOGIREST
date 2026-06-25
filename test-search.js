const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const searchStr = 'LogiRest';
    const searched = await prisma.adjustment.findMany({
      where: {
        OR: [
          { adjustmentNumber: { contains: searchStr, mode: 'insensitive' } },
          { notes: { contains: searchStr, mode: 'insensitive' } },
          { warehouse: { name: { contains: searchStr, mode: 'insensitive' } } },
          { createdBy: { name: { contains: searchStr, mode: 'insensitive' } } }
        ]
      },
      include: {
        warehouse: true,
        createdBy: true,
      }
    });
    console.log(`Search for "${searchStr}" found:`, searched.length);
    if (searched.length > 0) {
      console.log('Sample found adjustment:', searched[0].adjustmentNumber);
    }
  } catch (e) {
    console.error('ERROR', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
