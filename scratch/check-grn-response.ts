import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

const BadgeStatusSchema = z.enum([
 'DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'RECEIVED', 'REJECTED', 'CANCELLED', 
 'HEALTHY', 'LOW', 'CRITICAL', 'DELIVERED', 'COMPLETED', 'IN_STOCK', 'OUT_OF_STOCK', 'EXPIRED', 'LOCKED', 'ON_HOLD', 'ISSUED', 'PARTIAL',
 'IN_TRANSIT', 'PENDING', 'LOW_STOCK', 'REVIEW', 'OPEN', 'ACTIVE', 'INACTIVE', 'COUNTING', 'STARTED', 'COUNTING_COMPLETED', 'VARIANCE_SUBMITTED',
 'FULFILLED', 'VOIDED'
]);

const LineItemSchema = z.object({
 id: z.string(),
 item: z.object({
  id: z.string().min(1, 'Required'),
  code: z.string(),
  name: z.string(),
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  primaryUom: z.object({
   id: z.string(),
   code: z.string()
  })
 }),
 lot: z.object({
  id: z.string(),
  lotNumber: z.string(),
  expiryDate: z.string().nullable()
 }).nullable(),
 qty: z.number(),
 receivedQty: z.number().min(0, 'Must not be less than 0'),
 uomId: z.string(),
 unitCostForeign: z.number().nullable().refine(val => val === null || val >= 0, {
  message: 'Must not be less than 0'
 }),
 unitCostBase: z.number().nullable()
});

const GRNDetailSchema = z.object({
 id: z.string(),
 documentNumber: z.string(),
 status: BadgeStatusSchema,
 supplierId: z.string(),
 supplier: z.object({
 id: z.string(),
 name: z.string()
 }).optional(),
 poId: z.string().nullable(),
 poNumber: z.string().nullable(),
 poFxRate: z.number().nullable().optional(),
 currencyId: z.string(),
 currencyCode: z.string().optional().nullable(),
 warehouseId: z.string(),
 warehouseName: z.string().optional().nullable(),
 fxRate: z.number().nullable(),
 fxRateCapturedAt: z.string().nullable().optional(),
 version: z.number(),
 notes: z.string().nullable(),
 createdAt: z.string().optional(),
 createdBy: z.string().optional(),
 updatedAt: z.string().optional(),
 lines: z.array(LineItemSchema)
});

function mapGRNDetail(grn: any) {
  const grnLines = grn.lines || [];
  const purchaseOrder = grn.purchaseOrder;
  const supplier = purchaseOrder?.supplier;
  const warehouse = grn.warehouse;

  const lines = grnLines.map((line: any) => {
    const item = line.item;
    const lot = line.lot;
    const unitOfMeasure = item?.unitOfMeasure;

    return {
      id: line.id,
      item: item
        ? {
            id: item.id,
            code: item.sku || item.code || '',
            name: item.name,
            nameAr: item.name,
            nameEn: item.name,
            primaryUom: unitOfMeasure
              ? {
                  id: unitOfMeasure.id,
                  code: unitOfMeasure.code,
                }
              : { id: '', code: '' },
          }
        : {
            id: '',
            code: '',
            name: '',
            nameAr: '',
            nameEn: '',
            primaryUom: { id: '', code: '' },
          },
      lot: lot
        ? {
            id: lot.id,
            lotNumber: lot.lotNumber,
            expiryDate: lot.expiryDate
              ? (lot.expiryDate instanceof Date
                  ? lot.expiryDate
                  : new Date(lot.expiryDate)
                ).toISOString()
              : null,
          }
        : null,
      qty: Number(line.quantityReceived),
      receivedQty: Number(line.quantityReceived),
      uomId: item?.uomId || '',
      unitCostForeign: Number(line.unitPrice),
      unitCostBase: Number(line.unitPrice),
    };
  });

  const createdAtIso = grn.createdAt
    ? (grn.createdAt instanceof Date
        ? grn.createdAt
        : new Date(grn.createdAt)
      ).toISOString()
    : new Date().toISOString();

  return {
    id: grn.id,
    documentNumber: grn.grnNumber,
    status: grn.status,
    supplierId: purchaseOrder?.supplierId || '',
    supplier: supplier
      ? {
          id: supplier.id,
          name: supplier.name,
        }
      : undefined,
    supplierName: supplier?.name || '',
    poId: grn.poId,
    poNumber: purchaseOrder?.poNumber || '',
    poFxRate: 1.0,
    currencyId: purchaseOrder?.currencyId || '',
    currencyCode: purchaseOrder?.currency?.code || '',
    warehouseId: grn.warehouseId,
    warehouseName: warehouse?.name || '',
    fxRate: 1.0,
    fxRateCapturedAt: createdAtIso,
    version: grn.version,
    notes: '',
    createdAt: createdAtIso,
    createdBy: 'System',
    updatedAt: createdAtIso,
    lines,
  };
}

async function main() {
  const grnId = 'eb0e1959-2cd1-4da8-a256-1a542f9b984c';
  const grn = await prisma.goodsReceivedNote.findUnique({
    where: { id: grnId },
    include: {
      lines: {
        include: {
          item: {
            include: {
              unitOfMeasure: true,
              category: true,
            },
          },
          lot: true,
        },
      },
      purchaseOrder: {
        include: {
          supplier: true,
          currency: true,
        },
      },
      warehouse: true,
    },
  });

  if (!grn) {
    console.error('GRN not found in database!');
    return;
  }

  const mapped = mapGRNDetail(grn);
  
  const responseWrapper = {
    data: mapped
  };

  const schema = z.object({
    data: GRNDetailSchema
  });

  const result = schema.safeParse(responseWrapper);
  if (!result.success) {
    console.error('Zod Validation Failed!');
    console.error(JSON.stringify(result.error.issues, null, 2));
  } else {
    console.log('Zod Validation Passed Successfully!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
