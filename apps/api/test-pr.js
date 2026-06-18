const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.purchaseRequest.findFirst({
  include: {
    lines: {
      include: {
        item: {
          include: {
            unitOfMeasure: true
          }
        }
      }
    },
    createdBy: true,
    warehouse: true,
    branch: true
  }
}).then(pr => {
  console.log(JSON.stringify(pr, null, 2));
}).finally(() => {
  prisma.$disconnect();
});
