const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const prs = await prisma.purchaseRequest.findMany({
    include: { warehouse: true }
  });
  console.log(JSON.stringify(prs, null, 2));
}
main();
