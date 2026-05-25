import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const negativeItems = await prisma.warehouseItem.findMany({
    where: {
      OR: [
        { qtyOnHand: { lt: 0 } },
        { qtyAllocated: { lt: 0 } }
      ]
    },
    include: {
      item: true,
      warehouse: true
    }
  });

  console.log('--- NEGATIVE WAREHOUSE ITEMS ---');
  console.log(JSON.stringify(negativeItems, null, 2));

  const negativeLots = await prisma.warehouseItemLot.findMany({
    where: {
      qtyOnHand: { lt: 0 }
    },
    include: {
      item: true,
      warehouse: true
    }
  });

  console.log('--- NEGATIVE WAREHOUSE ITEM LOTS ---');
  console.log(JSON.stringify(negativeLots, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
