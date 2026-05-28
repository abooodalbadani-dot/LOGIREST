import { PrismaService } from './src/database/prisma.service';

async function main() {
  console.log('Scratch script started. Instantiating PrismaService...');
  const start = Date.now();
  const prisma = new PrismaService();

  console.log('Connecting to database...');
  await prisma.onModuleInit();
  console.log('Connected.');

  try {
    console.log('Attempting to count branches using PrismaService...');
    const count = await prisma.branch.count();
    console.log(`Success! Branch count: ${count} in ${Date.now() - start}ms`);
  } catch (err) {
    console.error('Failed to count branches:', err);
  }

  try {
    console.log('Attempting to create a branch using PrismaService...');
    const branch = await prisma.branch.create({
      data: {
        name: `Diag Branch ${Date.now()}`,
        code: `DIAG-${Date.now()}`,
      },
    });
    console.log('Branch created successfully:', branch.id);
    
    // Clean up
    await prisma.branch.delete({ where: { id: branch.id } });
    console.log('Branch cleaned up.');
  } catch (err) {
    console.error('Failed to create/delete branch:', err);
  }

  await prisma.onModuleDestroy();
  console.log('Finished.');
}

main();
