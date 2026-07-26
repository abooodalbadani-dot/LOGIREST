import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE adjustment_lines ADD COLUMN IF NOT EXISTS snapshot_qty_before DECIMAL(18,4);'
  );
  console.log('Column snapshot_qty_before added (or already exists) successfully.');
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
