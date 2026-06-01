import { PrismaClient } from '@prisma/client';
import {
  generateItemFactor,
  applyCostFactor,
  sanitizeValue,
} from './faker-helper';

const prisma = new PrismaClient();

interface ItemFactorMap {
  [itemId: string]: number;
}

async function collectItemFactors(): Promise<ItemFactorMap> {
  const items = await prisma.item.findMany({ select: { id: true } });
  const factors: ItemFactorMap = {};
  for (const item of items) {
    factors[item.id] = generateItemFactor();
  }
  console.log(
    `[seed.anonymized] Generated ${items.length} item-constant cost factors.`,
  );
  return factors;
}

async function anonymizeWarehouseItems(factors: ItemFactorMap) {
  const rows = await prisma.warehouseItem.findMany({
    select: { warehouseId: true, itemId: true, wac: true },
  });
  let updated = 0;
  for (const row of rows) {
    const factor = factors[row.itemId];
    if (!factor || row.wac === null) continue;
    await prisma.warehouseItem.update({
      where: {
        warehouseId_itemId: {
          warehouseId: row.warehouseId,
          itemId: row.itemId,
        },
      },
      data: { wac: applyCostFactor(Number(row.wac), factor) },
    });
    updated++;
  }
  console.log(`[seed.anonymized] WarehouseItem: ${updated} rows updated.`);
}

async function anonymizePii() {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: sanitizeValue('user', 'name')!,
        email: sanitizeValue('user', 'email')!,
      },
    });
  }
  console.log(`[seed.anonymized] User PII: ${users.length} rows sanitized.`);

  const suppliers = await prisma.supplier.findMany({ select: { id: true } });
  for (const supplier of suppliers) {
    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        name: sanitizeValue('supplier', 'name')!,
        contactEmail: sanitizeValue('supplier', 'contactEmail')!,
        contactPhone: sanitizeValue('supplier', 'contactPhone')!,
      },
    });
  }
  console.log(
    `[seed.anonymized] Supplier PII: ${suppliers.length} rows sanitized.`,
  );
}

async function seedAnonymized(): Promise<void> {
  console.log('[seed.anonymized] Starting anonymized staging seeder...');

  const itemCount = await prisma.item.count();
  if (itemCount === 0) {
    console.log(
      '[seed.anonymized] No items found. Skipping cost anonymization.',
    );
  } else {
    const factors = await collectItemFactors();
    await anonymizeWarehouseItems(factors);
    console.log('[seed.anonymized] Cost anonymization complete.');
  }

  await anonymizePii();
  console.log('[seed.anonymized] PII sanitization complete.');

  console.log('[seed.anonymized] Anonymized seeding finished successfully.');
}

seedAnonymized()
  .catch((e) => {
    console.error('[seed.anonymized] Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
