import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      warehouseScopes: {
        include: {
          warehouse: true,
        },
      },
    },
  });

  console.log('USERS_START');
  for (const u of users) {
    console.log(`User: ${u.email}, Role: ${u.role}, Active: ${u.isActive}`);
    for (const s of u.warehouseScopes) {
      console.log(`  Scope: WarehouseID: ${s.warehouseId}, WarehouseName: ${s.warehouse.name}, BranchID: ${s.warehouse.branchId}`);
    }
  }
  console.log('USERS_END');
}

main().catch(console.error).finally(() => prisma.$disconnect());


