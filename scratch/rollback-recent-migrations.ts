import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('Connected to database.');
    
    console.log('Rolling back recent migration logs...');
    const result = await prisma.$executeRaw`
      DELETE FROM _prisma_migrations 
      WHERE migration_name IN ('20260524000000_add_document_sequence_and_is_frozen', '20260524020000_sprint1_add_indexes')
    `;
    console.log('Rows deleted:', result);
  } catch (error) {
    console.error('Rollback failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
