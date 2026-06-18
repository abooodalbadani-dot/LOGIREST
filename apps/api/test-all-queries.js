const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    console.log('0');
    await prisma.warehouseItem.findMany({ select: { qtyOnHand: true, wac: true } });
    console.log('1');
    await prisma.purchaseRequest.count({ where: { status: 'PENDING_APPROVAL' } });
    console.log('2');
    await prisma.stocktakeSession.count({ where: { status: { in: ['STARTED', 'COUNTING', 'REVIEW'] } } });
    console.log('3');
    await prisma.warehouseItem.count({ where: { qtyOnHand: { lte: 0 } } });
    console.log('4');
    await prisma.user.count({ where: { isActive: true } });
    console.log('5');
    await prisma.lot.count({ where: { expiryDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), gte: new Date() }, status: 'ACTIVE' } });
    console.log('6');
    await prisma.purchaseOrder.count({ where: { status: { in: ['DRAFT', 'APPROVED', 'PARTIALLY_RECEIVED'] } } });
    console.log('7');
    await prisma.goodsReceivedNote.count({ where: { status: 'DRAFT' } });
    console.log('8');
    await prisma.inventoryIssue.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, issueNumber: true, status: true, createdAt: true, department: { select: { name: true } } } });
    console.log('9');
    await prisma.transfer.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, transferNumber: true, status: true, createdAt: true, toWarehouse: { select: { name: true } } } });
    console.log('10');
    await prisma.stockLedger.findMany({ orderBy: { postedAt: 'desc' }, take: 10, select: { id: true, quantity: true, documentType: true, postedAt: true, item: { select: { name: true, unitOfMeasure: { select: { code: true } } } } } });
    console.log('11');
    await prisma.lot.findMany({ where: { expiryDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), gte: new Date() }, status: 'ACTIVE' }, orderBy: { expiryDate: 'asc' }, take: 10, select: { id: true, lotNumber: true, expiryDate: true, itemId: true, item: { select: { name: true, unitOfMeasure: { select: { code: true } } } }, warehouseItemLots: { select: { qtyOnHand: true, warehouse: { select: { name: true } } }, take: 1 } } });
    console.log('12');
    await prisma.purchaseRequest.findMany({ where: { status: 'PENDING_APPROVAL' }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, requestNumber: true, status: true, createdAt: true, warehouse: { select: { name: true } } } });
    console.log('13');
    await prisma.kitchenRequest.count({ where: { status: { in: ['DRAFT', 'SUBMITTED'] } } });
    console.log('14');
    await prisma.warehouseItem.count();
    console.log('15');
    await prisma.warehouseItem.count({ where: { qtyOnHand: { gt: 0 } } });
    console.log('16');
    await prisma.outboxEvent.count({ where: { deadLettered: true } });
    console.log('17');
    await prisma.inventoryIssue.findMany({ where: { status: 'POSTED', createdAt: { gte: startOfToday } }, include: { lines: { select: { quantity: true } } } });
    console.log('18');
    await prisma.gRNLine.findMany({ where: { goodsReceivedNote: { status: 'POSTED' } }, select: { quantityReceived: true, unitPrice: true } });
    console.log('19');
    await prisma.supplier.findMany({ where: { isActive: true }, include: { purchaseOrders: { include: { goodsReceivedNotes: { where: { status: 'POSTED' }, include: { lines: { select: { quantityReceived: true, unitPrice: true } } } } } } } });
    console.log('20');
    await prisma.purchaseRequest.count();
    console.log('21');
    await prisma.purchaseOrder.count({ where: { prId: { not: null } } });
    console.log('22');
    await prisma.kitchenRequest.findMany({ where: { status: 'FULFILLED', issueId: { not: null } }, include: { inventoryIssue: { select: { createdAt: true } } } });
    console.log('23');
    await prisma.stockLedger.aggregate({ where: { postedAt: { gte: sevenDaysAgo }, documentType: { in: ['INVENTORY_ISSUE', 'TRANSFER'] } }, _sum: { quantity: true } });
    console.log('24');
    await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { user: true } });

    console.log('All queries passed!');
  } catch(err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
