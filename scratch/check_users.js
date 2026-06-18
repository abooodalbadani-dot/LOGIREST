const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      isActive: true,
    }
  });
  console.log('Seeded Users:', users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
