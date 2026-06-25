const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!user) {
    console.log('No ADMIN user found');
    return;
  }

  // The JWT access secret configured in docker-compose is:
  const secret = 'LogiRest_Access_9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    scopes: [],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  const token = jwt.sign(payload, secret);
  await prisma.$disconnect();

  console.log('Sending GRN create request via HTTP...');
  const response = await fetch('http://localhost:4000/api/v1/procurement/grns', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-branch-id': 'HQ',
      'x-warehouse-id': 'a0725a43-90cc-400c-8cfa-de2c78cc998d'
    },
    body: JSON.stringify({
      poId: '118fe4dd-d4c2-48b8-be38-a4871e4a4dc2',
      warehouseId: 'a0725a43-90cc-400c-8cfa-de2c78cc998d',
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
