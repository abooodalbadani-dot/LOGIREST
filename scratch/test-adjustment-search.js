const { PrismaClient } = require('../apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const list = await prisma.adjustment.findMany({
      include: {
        createdBy: true,
        warehouse: true,
      }
    });
    console.log('Total adjustments in DB:', list.length);
    if (list.length > 0) {
      console.log('Sample adjustment:', {
        id: list[0].id,
        adjustmentNumber: list[0].adjustmentNumber,
        status: list[0].status,
        createdBy: list[0].createdBy,
      });
    }

    const searchStr = 'ADJ';
    const searched = await prisma.adjustment.findMany({
      where: {
        OR: [
          { adjustmentNumber: { contains: searchStr, mode: 'insensitive' } }
        ]
      }
    });
    console.log(`Search for "${searchStr}" found:`, searched.length);

  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
