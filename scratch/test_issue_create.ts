import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://logirest:mysecretpassword@127.0.0.1:5432/logirest"
    }
  }
});

async function main() {
  console.log("Starting Prisma create issue test...");
  try {
    await prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.findFirst();
      if (!warehouse) throw new Error("No warehouse found");
      console.log("Found warehouse:", warehouse.id);

      const department = await tx.department.findFirst();
      if (!department) throw new Error("No department found");
      console.log("Found department:", department.id);

      const kitchenRequest = await tx.kitchenRequest.findFirst();
      const kitchenRequestId = kitchenRequest?.id;
      console.log("Found kitchen request:", kitchenRequestId);

      const issue = await tx.inventoryIssue.create({
        data: {
          issueNumber: "TST-ISS-" + Date.now(),
          warehouseId: warehouse.id,
          departmentId: department.id,
          status: 'DRAFT',
          lines: {
            create: []
          },
          kitchenRequest: kitchenRequestId
            ? { connect: { id: kitchenRequestId } }
            : undefined,
        },
        include: {
          kitchenRequest: true
        }
      });
      console.log("Create issue succeeded:", issue.id);
    });
  } catch (error) {
    console.error("Prisma Transaction failed with error:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
