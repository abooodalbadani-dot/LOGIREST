import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up negative test records...');

  // 1. Delete matching WarehouseItemLot negative records
  const lotDelete = await prisma.warehouseItemLot.deleteMany({
    where: {
      qtyOnHand: { lt: 0 }
    }
  });
  console.log(`Deleted ${lotDelete.count} negative WarehouseItemLot records.`);

  // 2. Delete matching WarehouseItem negative records
  const itemDelete = await prisma.warehouseItem.deleteMany({
    where: {
      OR: [
        { qtyOnHand: { lt: 0 } },
        { qtyAllocated: { lt: 0 } }
      ]
    }
  });
  console.log(`Deleted ${itemDelete.count} negative WarehouseItem records.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
