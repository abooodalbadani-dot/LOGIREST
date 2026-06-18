const { z } = require('zod');

// Schema definitions from frontend usePR.ts
const BadgeStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'POSTED', 'COMPLETED', 'DISPUTED', 'VOIDED']);

const PRLineSchema = z.object({
  id: z.string(),
  item: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    nameAr: z.string().optional(),
    nameEn: z.string().optional(),
    primaryUom: z.object({
      id: z.string(),
      code: z.string(),
    }),
    minStockLevel: z.number().optional(),
    reorderPoint: z.number().optional(),
  }),
  reqQty: z.number(),
  uomId: z.string(),
});

const PRDetailSchema = z.object({
  id: z.string(),
  documentNumber: z.string(),
  status: BadgeStatusSchema,
  departmentId: z.string(),
  expectedDate: z.string(),
  version: z.number().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.string().optional(),
  lines: z.array(PRLineSchema),
});

async function main() {
  const BASE_URL = 'http://localhost:4000/api/v1';
  console.log('Authenticating...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@otantikrestaurant.com', password: 'Password123!' })
  });
  
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  
  const prId = '1f60be26-331a-4911-b38e-a1fa219e7c2a';
  console.log(`Fetching PR detail for ${prId}...`);
  const prRes = await fetch(`${BASE_URL}/procurement/purchase-requests/${prId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-branch-id': 'b1',
      'x-warehouse-id': 'wh1'
    }
  });
  
  const payload = await prRes.json();
  console.log('PR raw payload:\n', JSON.stringify(payload, null, 2));
  
  try {
    console.log('Validating with Zod...');
    z.object({ data: PRDetailSchema }).parse(payload);
    console.log('✅ Success! PR detail schema parsed successfully.');
  } catch (err) {
    console.error('❌ Zod validation failed:', err);
  }
}

main().catch(err => console.error(err));
