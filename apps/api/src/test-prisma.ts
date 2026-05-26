import { PrismaService } from './database/prisma.service';

console.log('Instantiating PrismaService...');
const prisma = new PrismaService();
console.log('PrismaService instantiated successfully!');
prisma
  .$connect()
  .then(() => {
    console.log('Connected.');
    return prisma.$disconnect();
  })
  .then(() => console.log('Disconnected.'))
  .catch((err) => console.error('Error:', err));
