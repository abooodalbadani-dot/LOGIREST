const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'system_settings' },
  });
  console.log('System Setting value:', setting);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
