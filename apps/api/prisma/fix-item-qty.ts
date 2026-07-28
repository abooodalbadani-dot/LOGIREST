import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const item = await prisma.item.findFirst({ where: { sku: 'ITEM-0001' } });
  if (!item) return;

  const warehouseItems = await prisma.warehouseItem.findMany({ where: { itemId: item.id } });
  for (const wi of warehouseItems) {
    const oldQty = parseFloat(String(wi.qtyOnHand));
    if (oldQty > 10) {
      const newQty = Math.round((oldQty / 12) * 10000) / 10000;
      await prisma.warehouseItem.update({
        where: {
          warehouseId_itemId: { warehouseId: wi.warehouseId, itemId: wi.itemId },
        },
        data: { qtyOnHand: newQty },
      });
      console.log(`Updated warehouse ${wi.warehouseId}: ${oldQty} => ${newQty}`);
    }
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
