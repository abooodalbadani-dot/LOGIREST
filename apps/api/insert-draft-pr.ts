import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const pr = await prisma.purchaseRequest.create({
    data: {
      requestNumber: 'PR-2026-BR-001-00002',
      branchId: '942a830f-f922-400b-923f-6dee4deba552', // LogiRest Systembr
      warehouseId: 'a0725a43-90cc-400c-8cfa-de2c78cc998d', // LogiRest Systemwh
      createdById: '972c76b1-be0f-43bc-b45c-c70d7e8b256f',
      status: 'DRAFT',
      lines: {
        create: [
          {
            itemId: '6cc2d947-db4c-45ee-b7da-8903265e47a4',
            quantity: 10,
          }
        ]
      }
    }
  });
  console.log("Created Draft PR:", pr);
}
main().catch(console.error).finally(() => prisma.$disconnect());
