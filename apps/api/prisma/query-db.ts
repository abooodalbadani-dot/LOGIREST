import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('USERS_LIST_START');
  for (const u of users) {
    console.log(`Email: ${u.email}, Role: ${u.role}, Active: ${u.isActive}`);
  }
  console.log('USERS_LIST_END');
}

main().catch(console.error).finally(() => prisma.$disconnect());
