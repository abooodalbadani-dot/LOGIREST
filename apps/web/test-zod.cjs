const { z } = require('zod');
const schema = z.object({
  id: z.string(),
  documentNumber: z.string(),
  status: z.string(),
  departmentId: z.string(),
  expectedDate: z.string(),
  version: z.number().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.string().optional(),
  lines: z.array(z.object({
    id: z.string(),
    item: z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      nameAr: z.string().optional(),
      nameEn: z.string().optional(),
      primaryUom: z.object({
        id: z.string(),
        code: z.string()
      })
    }),
    reqQty: z.number(),
    uomId: z.string()
  }))
});

fetch('http://localhost:4000/api/v1/procurement/purchase-requests/1eba72ee-e484-48b9-b769-2095285c310c')
  .then(res => res.json())
  .then(data => {
    console.log('API returned:', JSON.stringify(data, null, 2));
    try {
      schema.parse(data.data);
      console.log('Validation passed!');
    } catch (e) {
      console.error('Validation failed:', e);
    }
  })
  .catch(console.error);
