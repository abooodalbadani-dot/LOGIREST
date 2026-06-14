const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@logirest.com', password: 'Password123!' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Login token retrieved:', token ? 'YES' : 'NO');

  const wh = await prisma.warehouse.findFirst({ where: { code: 'WH-HQ-01' } });

  const putRes = await fetch('http://localhost:4000/api/v1/barcodes/359339f1-19bb-4051-9e66-20081339f76a', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-warehouse-id': wh.id,
      'x-branch-id': wh.branchId
    },
    body: JSON.stringify({
      itemId: '3d8410af-5eae-4f0a-af50-3e76a477d289',
      code: '8801234567890',
      version: 2
    })
  });
  console.log('PUT Response status:', putRes.status);
  const putData = await putRes.json().catch(() => ({}));
  console.log('PUT Response data:', JSON.stringify(putData, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
