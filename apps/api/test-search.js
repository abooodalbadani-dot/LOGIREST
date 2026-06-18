const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const reqs = await prisma.purchaseRequest.findMany({
      where: {
        OR: [
          { requestNumber: { contains: 'a', mode: 'insensitive' } },
          { createdBy: { name: { contains: 'a', mode: 'insensitive' } } },
          { warehouse: { name: { contains: 'a', mode: 'insensitive' } } }
        ]
      }
    });
    console.log('SUCCESS', reqs.length);
  } catch (e) {
    console.error('ERROR', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
