import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const profile = await prisma.systemSetting.findUnique({
    where: { key: 'restaurant_profile' }
  });
  console.log('PROFILE_START');
  console.log(profile);
  console.log('PROFILE_END');
}

main().catch(console.error).finally(() => prisma.$disconnect());


