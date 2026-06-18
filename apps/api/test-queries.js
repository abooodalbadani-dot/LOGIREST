const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    console.log('Testing outboxEvent count...');
    await prisma.outboxEvent.count();
    
    console.log('Testing GRNLine findMany...');
    await prisma.gRNLine.findMany({ select: { quantityReceived: true } });
    
    console.log('Testing Supplier findMany...');
    await prisma.supplier.findMany({ include: { purchaseOrders: { include: { goodsReceivedNotes: true } } }});
    
    console.log('All passed!');
  } catch(err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
