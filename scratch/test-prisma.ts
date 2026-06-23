import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst();
    const department = await prisma.department.findFirst();
    const warehouse = await prisma.warehouse.findFirst();
    const item = await prisma.item.findFirst();

    if (!user || !department || !warehouse || !item) {
      console.error('Cannot run: missing master data.');
      return;
    }

    const testId = 'test-request-uuid-1234';
    // Cleanup any previous run
    await prisma.kitchenRequestItem.deleteMany({ where: { kitchenRequest: { id: testId } } }).catch(() => {});
    await prisma.kitchenRequest.deleteMany({ where: { id: testId } }).catch(() => {});

    console.log('Inserting test kitchen request directly via Prisma...');
    const created = await prisma.kitchenRequest.create({
      data: {
        id: testId,
        requestNumber: 'REQ-TEST-NOTES-123',
        departmentId: department.id,
        warehouseId: warehouse.id,
        notes: 'Test header notes here',
        status: 'DRAFT',
        requestedById: user.id,
        items: {
          create: [
            {
              itemId: item.id,
              quantityRequested: 10,
              quantityFulfilled: 0,
              notes: 'Test line item notes here',
            }
          ]
        }
      },
      include: {
        items: true
      }
    });

    console.log('Result of prisma.create:');
    console.log(`Header Notes: "${created.notes}"`);
    console.log(`Line Notes: "${created.items[0]?.notes}"`);

    const fetched = await prisma.kitchenRequest.findUnique({
      where: { id: testId },
      include: { items: true }
    });

    console.log('Result of prisma.findUnique:');
    console.log(`Header Notes: "${fetched?.notes}"`);
    console.log(`Line Notes: "${fetched?.items[0]?.notes}"`);

    // Clean up
    await prisma.kitchenRequestItem.deleteMany({ where: { requestId: testId } });
    await prisma.kitchenRequest.delete({ where: { id: testId } });
    console.log('Cleanup completed.');

  } catch (error) {
    console.error('Prisma test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
