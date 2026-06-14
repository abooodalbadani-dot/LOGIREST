import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo users...');
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const warehouses = await prisma.warehouse.findMany();

  const demoUsers = [
    { email: 'admin@logirest.local', name: 'System Administrator (Demo)', role: Role.ADMIN },
    { email: 'store@kitchen.io', name: 'Store Manager (Demo)', role: Role.STORE_MGR },
    { email: 'kitchen@kitchen.io', name: 'Kitchen Chief (Demo)', role: Role.KITCHEN_CHIEF },
    { email: 'procurement@kitchen.io', name: 'Procurement Officer (Demo)', role: Role.PROC_OFFICER },
  ];

  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: passwordHash },
      create: {
        email: u.email,
        passwordHash,
        name: u.name,
        role: u.role,
        isActive: true,
      },
    });
    console.log(`Demo user upserted: ${user.email} with role ${user.role}`);

    // Link user to all seeded warehouses so they have full scope visibility
    for (const wh of warehouses) {
      await prisma.userWarehouseScope.upsert({
        where: {
          userId_warehouseId: {
            userId: user.id,
            warehouseId: wh.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          warehouseId: wh.id,
        },
      });
    }
  }
  console.log('Demo user seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
