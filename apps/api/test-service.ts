import { PrismaService } from './src/database/prisma.service';
import { ReportsService } from './src/modules/reports/reports.service';

async function main() {
  console.log('Scratch script started. Instantiating PrismaService & ReportsService...');
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  const reportsService = new ReportsService(prisma);

  const warehouseId = 'b1b5d190-a1fe-485f-9c47-72d8ffd947ab';
  console.log('Querying dashboard stats for warehouseId:', warehouseId);

  try {
    const stats = await reportsService.getDashboardStats('WH_KEEPER', warehouseId);
    console.log('API RESPONSE STATS - FULFILLMENT QUEUE:');
    console.log(JSON.stringify(stats.fulfillmentQueue, null, 2));

    console.log('API RESPONSE STATS - RECENT REQUESTS:');
    console.log(JSON.stringify(stats.recentRequests, null, 2));
  } catch (err) {
    console.error('Failed to query dashboard stats:', err);
  }

  await prisma.onModuleDestroy();
  console.log('Finished.');
}

main();
