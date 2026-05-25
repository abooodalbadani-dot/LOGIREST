import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('Testing prisma deleteMany on outboxEvent and notificationLog...');
  try {
    const result = await prisma.outboxEvent.deleteMany({
      where: { eventType: 'SECURITY_ALERT_REPLAY_ATTACK' },
    });
    console.log('Delete outbox result:', result);
    
    const result2 = await prisma.notificationLog.deleteMany({
      where: { targetRole: 'ADMIN' },
    });
    console.log('Delete notification result:', result2);
  } catch (err) {
    console.error('Delete failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
