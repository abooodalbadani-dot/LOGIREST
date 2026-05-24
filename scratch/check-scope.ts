import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true }
  });
  console.log('All Users:', users);

  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@logirest.com' }
  });

  if (adminUser) {
    const scopes = await prisma.userWarehouseScope.findMany({
      where: { userId: adminUser.id },
      include: { warehouse: true }
    });
    console.log('Scopes for admin@logirest.com:', scopes.map(s => ({
      userId: s.userId,
      warehouseId: s.warehouseId,
      warehouseCode: s.warehouse.code,
      branchId: s.warehouse.branchId
    })));
  } else {
    console.log('admin@logirest.com not found!');
  }

  const mainWh = await prisma.warehouse.findFirst({
    where: { code: 'WH-HQ-01' }
  });
  console.log('HQ Warehouse:', mainWh);

  const mainBranch = await prisma.branch.findFirst({
    where: { code: 'HQ' }
  });
  console.log('HQ Branch:', mainBranch);
}

main().catch(console.error).finally(() => prisma.$disconnect());
