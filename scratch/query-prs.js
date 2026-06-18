const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const prs = await prisma.purchaseRequest.findMany({
    include: {
      lines: {
        include: {
          item: {
            include: {
              unitOfMeasure: true
            }
          }
        }
      }
    }
  });
  
  console.log(`Found ${prs.length} Purchase Requests in database.`);
  for (const pr of prs) {
    console.log(`\nPR ID: ${pr.id}`);
    console.log(`Document Number: ${pr.requestNumber}`);
    console.log(`Status: ${pr.status}`);
    console.log(`Lines count: ${pr.lines.length}`);
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
