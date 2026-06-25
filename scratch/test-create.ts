import { NestFactory } from '@nestjs/core';
import { AppModule } from '../apps/api/src/app.module';
import { KitchenRequestsService } from '../apps/api/src/modules/kitchen-requests/kitchen-requests.service';
import { PrismaService } from '../apps/api/src/database/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(KitchenRequestsService);
  const prisma = app.get(PrismaService);

  try {
    // Get a user, department, and warehouse to create a valid request
    const user = await prisma.user.findFirst();
    const department = await prisma.department.findFirst();
    const warehouse = await prisma.warehouse.findFirst();
    const item = await prisma.item.findFirst();

    if (!user || !department || !warehouse || !item) {
      console.error('Cannot run test: missing required database seeds (user, department, warehouse, or item).');
      return;
    }

    console.log(`Using User: ${user.name} (${user.id})`);
    console.log(`Using Department: ${department.name} (${department.id})`);
    console.log(`Using Warehouse: ${warehouse.name} (${warehouse.id})`);
    console.log(`Using Item: ${item.name} (${item.id})`);

    const newRequest = await service.create(
      {
        departmentId: department.id,
        warehouseId: warehouse.id,
        notes: 'Test header notes from script',
        items: [
          {
            itemId: item.id,
            quantityRequested: 5,
            notes: 'Test line item notes from script',
          },
        ],
      },
      user.id
    );

    console.log('Created Request:');
    console.log(JSON.stringify(newRequest, null, 2));

    // Fetch from database directly to verify persistence
    const dbReq = await prisma.kitchenRequest.findUnique({
      where: { id: newRequest.id },
      include: { items: true },
    });

    console.log('Fetched from DB:');
    console.log(JSON.stringify(dbReq, null, 2));

  } catch (error) {
    console.error('Test execution failed:', error);
  } finally {
    await app.close();
  }
}

main();
