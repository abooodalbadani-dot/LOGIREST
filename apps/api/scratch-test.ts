import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const po = await prisma.purchaseOrder.findFirst({
    where: { poNumber: 'PO-2026-BR-001-00001' },
    include: {
      lines: {
        include: {
          item: true,
        }
      }
    }
  });
  console.log('--- PO LINES ---');
  console.log(JSON.stringify(po?.lines, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
