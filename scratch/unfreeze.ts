import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const frozenBefore = await prisma.warehouseItem.findMany({
      where: { isFrozen: true },
      include: { item: true, warehouse: true }
    });
    console.log('Frozen items before unfreeze:', frozenBefore.map(f => ({
      item: f.item?.name || f.itemId,
      warehouse: f.warehouse?.name || f.warehouseId
    })));

    const result = await prisma.warehouseItem.updateMany({
      data: { isFrozen: false }
    });
    console.log('Successfully unfrozen items count:', result.count);
  } catch (err) {
    console.error('Failed to unfreeze items:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
