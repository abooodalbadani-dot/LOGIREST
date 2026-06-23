import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const krCount = await prisma.kitchenRequest.count();
    const itemCount = await prisma.kitchenRequestItem.count();
    const userCount = await prisma.user.count();
    const whCount = await prisma.warehouse.count();
    
    console.log(`Kitchen Requests: ${krCount}`);
    console.log(`Kitchen Request Items: ${itemCount}`);
    console.log(`Users: ${userCount}`);
    console.log(`Warehouses: ${whCount}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
