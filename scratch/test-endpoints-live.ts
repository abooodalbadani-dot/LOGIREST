import { z } from 'zod';

const SupplierSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  currencyId: z.string(),
});

const CurrencySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string().optional(),
  nameEn: z.string().optional(),
  nameAr: z.string().optional(),
  symbol: z.string().optional().nullable(),
  isBase: z.boolean().optional(),
  isActive: z.boolean().optional(),
  createdAt: z.string().optional(),
  version: z.number().optional()
}).transform((data) => ({
  ...data,
  name: data.name || data.nameEn || data.nameAr || '',
  nameEn: data.nameEn || data.name || '',
  nameAr: data.nameAr || data.name || '',
  isBase: data.isBase ?? false,
  isActive: data.isActive ?? true,
  createdAt: data.createdAt || new Date().toISOString(),
}));

const WarehouseSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  code: z.string(),
  name: z.string().optional(),
  isActive: z.boolean().optional(),
  version: z.number().optional()
});

const CurrencyResponseSchema = z.object({
  baseCurrency: z.string(),
  symbol: z.string(),
});

const PaginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

function paginatedSchema<T>(itemSchema: z.ZodType<T, z.ZodTypeDef, unknown>) {
  return z.object({
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  });
}

async function runTest() {
  console.log('Logging in...');
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@otantikrestaurant.com', password: 'Password123!' })
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}: ${await loginRes.text()}`);
  }
  const loginData = await loginRes.json() as { accessToken: string; user: { id: string } };
  const token = loginData.accessToken;
  const userId = loginData.user.id;
  console.log('Logged in successfully. User ID:', userId, 'Token exists:', !!token);

  // Retrieve user scopes to inject active scope headers
  const profileRes = await fetch('http://localhost:4000/api/v1/auth/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const profileData = await profileRes.json() as any;
  const scopes = profileData.user?.scopes || [];
  console.log('Scopes available:', scopes);
  const activeScope = scopes[0] || {};
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-branch-id': activeScope.branchId || '',
    'x-warehouse-id': activeScope.warehouseId || '',
  };
  console.log('Using headers:', headers);

  // 1. Fetch /settings/currency
  console.log('Fetching /settings/currency...');
  const currencySettingRes = await fetch('http://localhost:4000/api/v1/settings/currency', { headers });
  console.log('Status /settings/currency:', currencySettingRes.status);
  const currencySettingData = await currencySettingRes.json();
  console.log('Raw /settings/currency:', currencySettingData);
  try {
    const parsed = CurrencyResponseSchema.parse(currencySettingData);
    console.log('Parsed /settings/currency:', parsed);
  } catch (err: any) {
    console.error('Validation failed for /settings/currency:', err.errors);
  }

  // 2. Fetch /suppliers
  console.log('Fetching /suppliers...');
  const suppliersRes = await fetch('http://localhost:4000/api/v1/suppliers', { headers });
  console.log('Status /suppliers:', suppliersRes.status);
  const suppliersData = await suppliersRes.json();
  console.log('Raw /suppliers keys:', Object.keys(suppliersData));
  try {
    const parsed = z.object({ data: z.array(SupplierSchema) }).parse(suppliersData);
    console.log('Parsed /suppliers length:', parsed.data.length);
  } catch (err: any) {
    console.error('Validation failed for /suppliers:', err.errors || err);
  }

  // 3. Fetch /currencies
  console.log('Fetching /currencies...');
  const currenciesRes = await fetch('http://localhost:4000/api/v1/currencies', { headers });
  console.log('Status /currencies:', currenciesRes.status);
  const currenciesData = await currenciesRes.json();
  try {
    const parsed = z.object({ data: z.array(CurrencySchema) }).parse(currenciesData);
    console.log('Parsed /currencies length:', parsed.data.length);
  } catch (err: any) {
    console.error('Validation failed for /currencies:', err.errors || err);
  }

  // 4. Fetch /warehouses
  console.log('Fetching /warehouses...');
  const warehousesRes = await fetch('http://localhost:4000/api/v1/warehouses', { headers });
  console.log('Status /warehouses:', warehousesRes.status);
  const warehousesData = await warehousesRes.json();
  try {
    const parsed = paginatedSchema(WarehouseSchema).parse(warehousesData);
    console.log('Parsed /warehouses length:', parsed.data.length);
  } catch (err: any) {
    console.error('Validation failed for /warehouses:', err.errors || err);
  }
}

runTest().catch(console.error);
