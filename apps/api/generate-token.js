const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./src/app.module');
const { JwtService } = require('@nestjs/jwt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const jwtService = app.get(JwtService);
  
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!user) {
    console.log('No ADMIN user found');
    return;
  }
  
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    scopes: [],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };
  
  const token = jwtService.sign(payload);
  console.log('TOKEN=' + token);
  
  await app.close();
  await prisma.$disconnect();
}
main();
