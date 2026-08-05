import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';

interface UomConversionDto {
  id?: string;
  fromUomId?: string;
  from_uom_id?: string;
  toUomId?: string;
  to_uom_id?: string;
  factor: number;
}

interface ItemBarcodeDto {
  barcode: string;
  uomId?: string;
  uom_id?: string;
}

interface ItemCreateDto {
  name?: string;
  categoryId?: string;
  primaryUomId?: string;
  trackLots?: boolean;
  minStockLevel?: number;
  reorderPoint?: number;
  isActive?: boolean;
  code?: string;
  name_en?: string;
  name_ar?: string;
  category_id?: string;
  primary_uom_id?: string;
  track_lots?: boolean;
  min_stock_level?: number;
  reorder_point?: number;
  is_active?: boolean;
  barcode?: string;
  barcodes?: ItemBarcodeDto[];
  barcode_mappings?: ItemBarcodeDto[];
  image?: string;
  uomConversions?: UomConversionDto[];
  uom_conversions?: UomConversionDto[];
}

interface ItemUpdateDto extends ItemCreateDto {
  version?: number;
}

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapDbItemToFrontend(item: {
    id: string;
    sku: string;
    name: string;
    categoryId: string | null;
    uomId: string;
    isBatched: boolean;
    hasExpiry: boolean;
    isActive: boolean;
    reorderPoint: unknown;
    minStockLevel?: unknown;
    image: string | null;
    version: number;
    barcodeMappings: Array<{ barcode: string }>;
    category: { id: string; code: string; name: string; version: number } | null;
    unitOfMeasure: { id: string; code: string; name: string; version: number } | null;
    uomConversions?: Array<{
      id?: string;
      fromUomId: string;
      toUomId: string;
      factor: unknown;
      fromUom?: { id: string; code: string; name: string } | null;
      toUom?: { id: string; code: string; name: string } | null;
    }>;
    warehouseItems?: Array<{ qtyOnHand: unknown }>;
  }) {
    const qtyVal = item.warehouseItems?.[0]?.qtyOnHand
      ? parseFloat(String(item.warehouseItems[0].qtyOnHand))
      : 0;

    const mappedConversions = (item.uomConversions || []).map((c) => ({
      id: c.id,
      fromUomId: c.fromUomId,
      from_uom_id: c.fromUomId,
      fromUomCode: c.fromUom?.code ?? '',
      fromUomName: c.fromUom?.name ?? '',
      toUomId: c.toUomId,
      to_uom_id: c.toUomId,
      toUomCode: c.toUom?.code ?? '',
      toUomName: c.toUom?.name ?? '',
      factor: parseFloat(String(c.factor)),
    }));

    const primaryUomObj = item.unitOfMeasure
      ? {
          id: item.unitOfMeasure.id,
          code: item.unitOfMeasure.code,
          name: item.unitOfMeasure.name,
          name_ar: item.unitOfMeasure.name,
          name_en: item.unitOfMeasure.name,
          category: 'General',
          is_active: true,
          created_at: new Date().toISOString(),
          version: item.unitOfMeasure.version,
        }
      : null;

    return {
      id: item.id,
      code: item.sku,
      barcode: item.barcodeMappings?.[0]?.barcode || '',
      barcodes: (item.barcodeMappings || []).map((bm: { barcode: string; uomId?: string | null }) => ({
        barcode: bm.barcode,
        uomId: bm.uomId || item.uomId || null,
      })),
      barcodeMappings: (item.barcodeMappings || []).map((bm: { barcode: string; uomId?: string | null }) => ({
        barcode: bm.barcode,
        uomId: bm.uomId || item.uomId || null,
      })),
      name: item.name,
      name_ar: item.name,
      name_en: item.name,
      category_id: item.categoryId,
      qty_on_hand: qtyVal,
      qtyOnHand: qtyVal,
      category: item.category
        ? {
            id: item.category.id,
            code: item.category.code,
            name: item.category.name,
            version: item.category.version,
          }
        : null,
      primary_uom: primaryUomObj,
      primaryUom: primaryUomObj,
      uom_conversions: mappedConversions,
      uomConversions: mappedConversions,
      track_lots: item.isBatched || item.hasExpiry,
      is_batched: item.isBatched,
      has_expiry: item.hasExpiry,
      is_batch_tracked: item.isBatched || item.hasExpiry,
      isBatched: item.isBatched,
      hasExpiry: item.hasExpiry,
      isBatchTracked: item.isBatched || item.hasExpiry,
      trackLots: item.isBatched || item.hasExpiry,
      min_stock_level: item.minStockLevel != null
        ? parseFloat(String(item.minStockLevel))
        : 0,
      minStockLevel: item.minStockLevel != null
        ? parseFloat(String(item.minStockLevel))
        : 0,
      reorder_point: item.reorderPoint != null
        ? parseFloat(String(item.reorderPoint))
        : 0,
      last_purchase_price: 0,
      is_active: item.isActive,
      version: item.version,
      image: item.image || '',
    };
  }

  async findAll(filters: {
    search?: string;
    category_id?: string;
    is_active?: string;
    barcode?: string;
    warehouse_id?: string;
    page?: string;
    limit?: string;
  }) {
    const pageNum = filters.page ? parseInt(filters.page, 10) : 1;
    const limitNum = Math.min(filters.limit ? parseInt(filters.limit, 10) : 20, 50);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.ItemWhereInput = {};

    if (filters.is_active !== undefined) {
      where.isActive = filters.is_active === 'true';
    }

    if (filters.category_id) {
      where.categoryId = filters.category_id;
    }

    if (filters.barcode) {
      where.barcodeMappings = {
        some: {
          barcode: filters.barcode,
        },
      };
    }

    if (filters.warehouse_id) {
      where.warehouseItems = {
        some: {
          warehouseId: filters.warehouse_id,
        },
      };
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { barcodeMappings: { some: { barcode: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        skip,
        take: limitNum,
        select: {
          id: true,
          sku: true,
          name: true,
          categoryId: true,
          uomId: true,
          isActive: true,
          image: true,
          reorderPoint: true,
          minStockLevel: true,
          isBatched: true,
          hasExpiry: true,
          version: true,
          category: { select: { id: true, code: true, name: true, version: true } },
          unitOfMeasure: { select: { id: true, code: true, name: true, version: true } },
          barcodeMappings: { select: { barcode: true, uomId: true } },
          uomConversions: {
            include: {
              fromUom: { select: { id: true, code: true, name: true } },
              toUom: { select: { id: true, code: true, name: true } },
            },
          },
          warehouseItems: filters.warehouse_id
            ? {
                where: { warehouseId: filters.warehouse_id },
                select: { qtyOnHand: true },
              }
            : false,
        },
        orderBy: { sku: 'asc' },
      }),
      this.prisma.item.count({ where }),
    ]);

    return {
      data: items.map((item) => this.mapDbItemToFrontend(item)),
      meta: {
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getNextCode(): Promise<{ nextCode: string }> {
    const lastItem = await this.prisma.item.findFirst({
      where: { sku: { startsWith: 'ITEM-' } },
      orderBy: { sku: 'desc' },
      select: { sku: true },
    });

    let maxNum = 0;
    if (lastItem) {
      const matches = lastItem.sku.match(/^ITEM-(\d+)$/);
      if (matches) {
        maxNum = parseInt(matches[1], 10);
      }
    }

    return { nextCode: `ITEM-${String(maxNum + 1).padStart(4, '0')}` };
  }

  async findOne(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        unitOfMeasure: true,
        barcodeMappings: true,
        uomConversions: {
          include: {
            fromUom: { select: { id: true, code: true, name: true } },
            toUom: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    const hasTransactions =
      (await this.prisma.stockLedger.count({
        where: { itemId: id },
      })) > 0;

    return {
      ...this.mapDbItemToFrontend(item),
      has_transactions: hasTransactions,
    };
  }

  async create(body: ItemCreateDto, userId: string, ipAddress?: string) {
    let { code } = body;
    const name_en = body.name_en;
    const name_ar = body.name_ar;
    const category_id = body.category_id || body.categoryId;
    const primary_uom_id = body.primary_uom_id || body.primaryUomId;
    const track_lots = body.track_lots ?? body.trackLots;
    const min_stock_level = body.min_stock_level ?? body.minStockLevel;
    const reorder_point = body.reorder_point ?? body.reorderPoint;
    const is_active = body.is_active ?? body.isActive;
    const barcode = body.barcode;
    const image = body.image;

    if (!category_id || !primary_uom_id) {
      throw new BadRequestException(
        'category_id and primary_uom_id are required',
      );
    }

    if (!code || code.trim() === '') {
      const allItems = await this.prisma.item.findMany({
        where: {
          sku: {
            startsWith: 'ITEM-',
          },
        },
        select: {
          sku: true,
        },
      });
      let maxNum = 0;
      for (const item of allItems) {
        const matches = item.sku.match(/^ITEM-(\d+)$/);
        if (matches) {
          const num = parseInt(matches[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
      code = `ITEM-${String(maxNum + 1).padStart(4, '0')}`;
    } else {
      // Check if sku exists
      const existing = await this.prisma.item.findUnique({
        where: { sku: code },
      });
      if (existing) {
        throw new ConflictException(
          `Item with code/sku ${code} already exists`,
        );
      }
    }

    const name = body.name || name_en || name_ar || code;
    const rawConversions = body.uomConversions || body.uom_conversions || [];

    const created = await this.prisma.$transaction(async (tx) => {
      const newItem = await tx.item.create({
        data: {
          sku: code,
          name,
          categoryId: category_id,
          uomId: primary_uom_id,
          isBatched: track_lots || false,
          hasExpiry: track_lots || false, // default expiry tracking if batched
          isActive: is_active !== undefined ? is_active : true,
          reorderPoint: reorder_point !== undefined ? reorder_point : null,
          minStockLevel: min_stock_level !== undefined ? min_stock_level : null,
          image: image || null,
          version: 1,
        },
      });

      const barcodesList = body.barcodes || body.barcode_mappings;
      if (barcodesList && barcodesList.length > 0) {
        const validBarcodes = barcodesList.filter(b => b.barcode && b.barcode.trim() !== '');
        if (validBarcodes.length > 0) {
          await tx.barcodeMapping.createMany({
            data: validBarcodes.map(b => ({
              itemId: newItem.id,
              barcode: b.barcode.trim(),
              uomId: b.uomId || b.uom_id || primary_uom_id || null,
              version: 1,
            })),
          });
        }
      } else if (barcode) {
        await tx.barcodeMapping.create({
          data: {
            itemId: newItem.id,
            barcode: barcode.trim(),
            uomId: primary_uom_id || null,
            version: 1,
          },
        });
      }

      if (rawConversions.length > 0) {
        const validConversions = rawConversions.filter(
          (c) =>
            (c.fromUomId || c.from_uom_id) &&
            (c.toUomId || c.to_uom_id) &&
            c.factor > 0,
        );
        if (validConversions.length > 0) {
          await tx.uomConversion.createMany({
            data: validConversions.map((c) => ({
              itemId: newItem.id,
              fromUomId: (c.fromUomId || c.from_uom_id)!,
              toUomId: (c.toUomId || c.to_uom_id)!,
              factor: c.factor,
            })),
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ITEM_CREATED',
          targetTable: 'items',
          targetId: newItem.id,
          beforeStateJson: '',
          afterStateJson: JSON.stringify(newItem),
          ipAddress: ipAddress || null,
        },
      });

      return newItem;
    });

    return this.findOne(created.id);
  }

  async update(
    id: string,
    body: ItemUpdateDto,
    userId: string,
    ipAddress?: string,
  ) {
    const existing = await this.prisma.item.findUnique({
      where: { id },
      include: { barcodeMappings: true },
    });

    if (!existing) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    // Optimistic locking check
    if (body.version !== undefined && existing.version !== body.version) {
      throw new ConflictException(
        'Optimistic locking failure: version mismatch',
      );
    }

    const code = body.code;
    const name_en = body.name_en;
    const name_ar = body.name_ar;
    const category_id = body.category_id || body.categoryId;
    const primary_uom_id = body.primary_uom_id || body.primaryUomId;
    const track_lots = body.track_lots ?? body.trackLots;
    const min_stock_level = body.min_stock_level ?? body.minStockLevel;
    const reorder_point = body.reorder_point ?? body.reorderPoint;
    const is_active = body.is_active ?? body.isActive;
    const barcode = body.barcode;
    const image = body.image;
    const name = body.name || name_en || name_ar || existing.name;
    const rawConversions = body.uomConversions ?? body.uom_conversions;
    const targetUomId = primary_uom_id || existing.uomId;
    const isUomChanged = Boolean(targetUomId && targetUomId !== existing.uomId);

    let uomConversionRatio: number | null = null;
    if (isUomChanged) {
      const dbConversions = await this.prisma.uomConversion.findMany({
        where: { itemId: id },
      });

      let foundConv: { fromUomId: string; toUomId: string; factor: unknown } | undefined = dbConversions.find(
        (c) =>
          (c.fromUomId === existing.uomId && c.toUomId === targetUomId) ||
          (c.fromUomId === targetUomId && c.toUomId === existing.uomId),
      );

      if (!foundConv && rawConversions) {
        const payloadConv = rawConversions.find((c) => {
          const fId = c.fromUomId || c.from_uom_id;
          const tId = c.toUomId || c.to_uom_id;
          return (
            (fId === existing.uomId && tId === targetUomId) ||
            (fId === targetUomId && tId === existing.uomId)
          );
        });
        if (payloadConv) {
          foundConv = {
            fromUomId: payloadConv.fromUomId || payloadConv.from_uom_id || '',
            toUomId: payloadConv.toUomId || payloadConv.to_uom_id || '',
            factor: payloadConv.factor,
          };
        }
      }

      if (foundConv) {
        const factorVal = parseFloat(String(foundConv.factor));
        if (factorVal > 0) {
          if (foundConv.fromUomId === existing.uomId && foundConv.toUomId === targetUomId) {
            uomConversionRatio = factorVal;
          } else {
            uomConversionRatio = 1 / factorVal;
          }
        }
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      let nextMinStock = min_stock_level !== undefined ? min_stock_level : existing.minStockLevel;
      let nextReorder = reorder_point !== undefined ? reorder_point : existing.reorderPoint;

      if (isUomChanged && uomConversionRatio && uomConversionRatio > 0) {
        if (min_stock_level === undefined && existing.minStockLevel) {
          nextMinStock = Math.round(parseFloat(String(existing.minStockLevel)) * uomConversionRatio * 10000) / 10000 as unknown as number;
        }
        if (reorder_point === undefined && existing.reorderPoint) {
          nextReorder = Math.round(parseFloat(String(existing.reorderPoint)) * uomConversionRatio * 10000) / 10000 as unknown as number;
        }
      }

      const res = await tx.item.update({
        where: { id },
        data: {
          sku: code || existing.sku,
          name,
          categoryId: category_id || existing.categoryId,
          uomId: targetUomId,
          isBatched: track_lots !== undefined ? track_lots : existing.isBatched,
          hasExpiry: track_lots !== undefined ? track_lots : existing.hasExpiry,
          isActive: is_active !== undefined ? is_active : existing.isActive,
          reorderPoint: nextReorder,
          minStockLevel: nextMinStock,
          image: image !== undefined ? image || null : existing.image,
          version: existing.version + 1,
        },
      });

      if (isUomChanged && uomConversionRatio && uomConversionRatio > 0) {
        const warehouseItems = await tx.warehouseItem.findMany({
          where: { itemId: id },
        });
        for (const wi of warehouseItems) {
          const oldQty = parseFloat(String(wi.qtyOnHand || 0));
          if (oldQty !== 0) {
            const newQty = Math.round(oldQty * uomConversionRatio * 10000) / 10000;
            await tx.warehouseItem.update({
              where: {
                warehouseId_itemId: {
                  warehouseId: wi.warehouseId,
                  itemId: wi.itemId,
                },
              },
              data: { qtyOnHand: newQty },
            });
          }
        }

        const warehouseItemLots = await tx.warehouseItemLot.findMany({
          where: { itemId: id },
        });
        for (const wil of warehouseItemLots) {
          const oldQty = parseFloat(String(wil.qtyOnHand || 0));
          if (oldQty !== 0) {
            const newQty = Math.round(oldQty * uomConversionRatio * 10000) / 10000;
            await tx.warehouseItemLot.update({
              where: {
                warehouseId_itemId_lotId: {
                  warehouseId: wil.warehouseId,
                  itemId: wil.itemId,
                  lotId: wil.lotId,
                },
              },
              data: { qtyOnHand: newQty },
            });
          }
        }
      }

      const barcodesList = body.barcodes ?? body.barcode_mappings;
      if (barcodesList !== undefined) {
        await tx.barcodeMapping.deleteMany({ where: { itemId: id } });
        const validBarcodes = barcodesList.filter(b => b.barcode && b.barcode.trim() !== '');
        if (validBarcodes.length > 0) {
          await tx.barcodeMapping.createMany({
            data: validBarcodes.map(b => ({
              itemId: id,
              barcode: b.barcode.trim(),
              uomId: b.uomId || b.uom_id || primary_uom_id || existing.uomId || null,
              version: 1,
            })),
          });
        }
      } else if (barcode) {
        // Upsert barcode
        const existingBarcode = existing.barcodeMappings?.[0];
        if (existingBarcode) {
          await tx.barcodeMapping.update({
            where: { id: existingBarcode.id },
            data: { barcode: barcode.trim(), uomId: primary_uom_id || existing.uomId || null, version: existingBarcode.version + 1 },
          });
        } else {
          await tx.barcodeMapping.create({
            data: { itemId: id, barcode: barcode.trim(), uomId: primary_uom_id || existing.uomId || null, version: 1 },
          });
        }
      }

      if (rawConversions !== undefined) {
        await tx.uomConversion.deleteMany({ where: { itemId: id } });
        const validConversions = rawConversions.filter(
          (c) =>
            (c.fromUomId || c.from_uom_id) &&
            (c.toUomId || c.to_uom_id) &&
            c.factor > 0,
        );
        if (validConversions.length > 0) {
          await tx.uomConversion.createMany({
            data: validConversions.map((c) => ({
              itemId: id,
              fromUomId: (c.fromUomId || c.from_uom_id)!,
              toUomId: (c.toUomId || c.to_uom_id)!,
              factor: c.factor,
            })),
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ITEM_UPDATED',
          targetTable: 'items',
          targetId: id,
          beforeStateJson: JSON.stringify(existing),
          afterStateJson: JSON.stringify(res),
          ipAddress: ipAddress || null,
        },
      });

      return res;
    });

    return this.findOne(updated.id);
  }

  async remove(id: string, userId: string, ipAddress?: string) {
    const existing = await this.prisma.item.findUnique({
      where: { id },
      include: {
        warehouseItems: {
          where: {
            qtyOnHand: { gt: 0 },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    if (existing.warehouseItems.length > 0) {
      throw new BadRequestException('GUARD_STOCK_EXISTS');
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete barcode mappings first
      await tx.barcodeMapping.deleteMany({ where: { itemId: id } });
      // Delete UoM conversions
      await tx.uomConversion.deleteMany({ where: { itemId: id } });
      // Delete the item
      await tx.item.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ITEM_DELETED',
          targetTable: 'items',
          targetId: id,
          beforeStateJson: JSON.stringify(existing),
          afterStateJson: '',
          ipAddress: ipAddress || null,
        },
      });
    });

    return { success: true };
  }
}
