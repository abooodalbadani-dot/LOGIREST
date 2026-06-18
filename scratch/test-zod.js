const { z } = require('zod');

// 1. Supplier Schema
const SupplierSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  currencyId: z.string(),
});

// 2. Currency Schema
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

// 3. Warehouse Schema
const WarehouseSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  code: z.string(),
  name: z.string().optional(),
  isActive: z.boolean().optional(),
  version: z.number().optional()
});

const PaginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

function paginatedSchema(itemSchema) {
  return z.object({
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  });
}

// Actual Data payloads from API test
const supplierResponse = {
  "data": [
    {
      "id": "e28bd028-0147-4874-a655-3fcc684b4bf2",
      "code": "SUP-0001",
      "name": "Abdullrahman Albadani",
      "contactEmail": "abooodalbadani@gmail.com",
      "contactPhone": "+967774921250",
      "contactName": "Abdullrahman Albadani",
      "currencyId": "c6f332a7-aac4-4dc8-98ed-682bc6c8d436",
      "paymentTerms": "NET_30",
      "isActive": true,
      "version": 1
    }
  ]
};

const currencyResponse = {
  "data": [
    {
      "id": "c6f332a7-aac4-4dc8-98ed-682bc6c8d436",
      "code": "CNY",
      "name": "CHINA YUUAN",
      "nameEn": "CHINA YUUAN",
      "nameAr": "CHINA YUUAN",
      "symbol": "CNY",
      "isBase": true,
      "isActive": true,
      "createdAt": "2026-06-17T13:40:48.193Z",
      "version": 2
    },
    {
      "id": "7b48e2fb-fed4-41ab-8e28-eaed78f0fc9e",
      "code": "USD",
      "name": "US Dollar",
      "nameEn": "US Dollar",
      "nameAr": "US Dollar",
      "symbol": "USD$",
      "isBase": false,
      "isActive": true,
      "createdAt": "2026-06-17T13:40:48.193Z",
      "version": 3
    }
  ]
};

const warehouseResponse = {
  "data": [
    {
      "id": "3ecd0f12-0375-4a9a-9c46-900d056e3bca",
      "branchId": "00ddac3d-45ab-4d92-bb33-57da07188c55",
      "name": "HQ Main Warehouse",
      "code": "WH-HQ-01",
      "isLocked": false,
      "isActive": true,
      "version": 1,
      "createdAt": "2026-06-16T22:23:57.507Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 1,
    "totalPages": 1
  }
};

const currencySettingResponse = {
  "baseCurrency": "CNY",
  "symbol": "¥"
};

const CurrencyResponseSchema = z.object({
  baseCurrency: z.string(),
  symbol: z.string(),
});

function runTest() {
  try {
    console.log('Testing Supplier parsing...');
    z.object({ data: z.array(SupplierSchema) }).parse(supplierResponse);
    console.log('   ✅ Supplier parsed successfully.');

    console.log('Testing Currency list parsing...');
    z.object({ data: z.array(CurrencySchema) }).parse(currencyResponse);
    console.log('   ✅ Currency list parsed successfully.');

    console.log('Testing Warehouse paginated parsing...');
    paginatedSchema(WarehouseSchema).parse(warehouseResponse);
    console.log('   ✅ Warehouse parsed successfully.');

    console.log('Testing Currency settings parsing...');
    CurrencyResponseSchema.parse(currencySettingResponse);
    console.log('   ✅ Currency settings parsed successfully.');

    console.log('\n🎉 All schemas parsed successfully!');
  } catch (err) {
    console.error('❌ Parsing failed:', err);
  }
}

runTest();
