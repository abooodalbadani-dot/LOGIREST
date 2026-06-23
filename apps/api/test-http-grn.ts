import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const jwtService = app.get(JwtService);
  const prisma = new PrismaClient();

  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!user) {
    console.log('No ADMIN user found');
    await app.close();
    return;
  }

  const payloadToken = {
    sub: user.id,
    email: user.email,
    role: user.role,
    scopes: [],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  const token = jwtService.sign(payloadToken);
  await app.close();
  await prisma.$disconnect();

  console.log('Generated token, sending request to local NestJS server...');

  const response = await fetch('http://localhost:4000/api/v1/procurement/grns', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-branch-id': 'HQ', // scope headers
    },
    body: JSON.stringify({
      poId: '118fe4dd-d4c2-48b8-be38-a4871e4a4dc2',
      warehouseId: 'a0725a43-90cc-400c-8cfa-de2c78cc998d', // real warehouse UUID
      notes: 'Test HTTP GRN',
      lines: [
        {
          itemId: '47fb0d07-30db-4703-b0c6-7fdca25a8790',
          receivedQty: 5,
          unitCostForeign: 10
        }
      ]
    })
  });

  const status = response.status;
  const data = await response.json();
  console.log('HTTP STATUS:', status);
  console.log('HTTP RESPONSE:', JSON.stringify(data, null, 2));
}

main().catch(console.error);
