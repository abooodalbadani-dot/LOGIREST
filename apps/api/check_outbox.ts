import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const events = await prisma.outboxEvent.findMany({
    where: { eventType: 'PASSWORD_RESET_REQUESTED' },
    orderBy: { createdAt: 'desc' },
    take: 2,
  });
  console.log(JSON.stringify(events, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
