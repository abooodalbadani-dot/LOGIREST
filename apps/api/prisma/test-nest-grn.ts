import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { GrnService } from '../src/modules/purchasing/grn/grn.service';
import { PrismaClient } from '@prisma/client';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const grnService = app.get(GrnService);
  const prisma = app.get(PrismaClient);

  // Find the PO and a warehouse
  const po = await prisma.purchaseOrder.findFirst();
  const wh = await prisma.warehouse.findFirst();
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  if (!po || !wh || !user) {
    console.log('Missing data:', { po: !!po, wh: !!wh, user: !!user });
    await app.close();
    return;
  }

  console.log('Testing GrnService.create with:');
  console.log(`  PO: ${po.poNumber} (${po.id})`);
  console.log(`  Warehouse: ${wh.name} (${wh.id})`);
  console.log(`  User: ${user.email} (${user.id})`);

  try {
    const result = await grnService.create({
      poId: po.id,
      warehouseId: wh.id,
      notes: 'Test GRN from script',
      lines: [
        {
          itemId: 'fake-item-id-not-used-or-ignored',
          quantity: 10,
          unitPrice: 100,
        }
      ]
    }, user.id);
    console.log('SUCCESS:', result);
  } catch (err) {
    console.error('ERROR:', err);
  }

  await app.close();
}

main().catch(console.error);
