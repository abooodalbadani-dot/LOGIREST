const { z } = require('zod');

// We copy the schema exactly from master-data.ts to test it in plain JS
const BranchFormSchema = z.object({
  code: z.string().optional()
    .refine(val => !val || val.length >= 2, { message: 'validation.code_min' })
    .refine(val => !val || /^[A-Z0-9_-]+$/.test(val), { message: 'validation.code_format' }),
  name: z.string().min(3, 'validation.name_min'),
  isActive: z.boolean().optional(),
  version: z.number().optional()
});

try {
  const result = BranchFormSchema.parse({
    code: 'BR-001',
    name: 'otantik restaurant',
    isActive: true
  });
  console.log('Validation Succeeded:', result);
} catch (err) {
  console.error('Validation Failed:', err.errors);
}
