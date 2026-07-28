import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const item = await prisma.item.findFirst({
    where: { sku: 'ITEM-0001' },
    include: {
      unitOfMeasure: true,
      warehouseItems: { include: { warehouse: true } },
      uomConversions: { include: { fromUom: true, toUom: true } },
      stockLedgers: { take: 10, orderBy: { postedAt: 'desc' } },
    },
  });
  console.log(JSON.stringify(item, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
