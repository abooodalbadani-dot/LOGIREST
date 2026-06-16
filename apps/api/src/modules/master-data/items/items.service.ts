import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';

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
}

interface ItemUpdateDto extends ItemCreateDto {
  version?: number;
}

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapDbItemToFrontend(
    item: Prisma.ItemGetPayload<{
      include: { unitOfMeasure: true; barcodeMappings: true; category: true };
    }>,
  ) {
    return {
      id: item.id,
      code: item.sku,
      barcode: item.barcodeMappings?.[0]?.barcode || '',
      name: item.name,
      name_ar: item.name,
      name_en: item.name,
      category_id: item.categoryId,
      category: item.category
        ? {
            id: item.category.id,
            code: item.category.code,
            name: item.category.name,
            version: item.category.version,
          }
        : null,
      primary_uom: item.unitOfMeasure
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
        : null,
      uom_conversions: [],
      track_lots: item.isBatched,
      min_stock_level: 0,
      reorder_point: item.reorderPoint
        ? parseFloat(item.reorderPoint.toString())
        : 0,
      last_purchase_price: 0,
      is_active: item.isActive,
      version: item.version,
    };
  }

  async findAll(filters: {
    search?: string;
    category_id?: string;
    is_active?: string;
    barcode?: string;
    page?: string;
    limit?: string;
  }) {
    const pageNum = filters.page ? parseInt(filters.page, 10) : 1;
    const limitNum = filters.limit ? parseInt(filters.limit, 10) : 10;
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

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          category: true,
          unitOfMeasure: true,
          barcodeMappings: true,
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

  async findOne(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        unitOfMeasure: true,
        barcodeMappings: true,
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
          version: 1,
        },
      });

      if (barcode) {
        await tx.barcodeMapping.create({
          data: {
            itemId: newItem.id,
            barcode,
            version: 1,
          },
        });
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
    const reorder_point = body.reorder_point ?? body.reorderPoint;
    const is_active = body.is_active ?? body.isActive;
    const barcode = body.barcode;
    const name = body.name || name_en || name_ar || existing.name;

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.item.update({
        where: { id },
        data: {
          sku: code || existing.sku,
          name,
          categoryId: category_id || existing.categoryId,
          uomId: primary_uom_id || existing.uomId,
          isBatched: track_lots !== undefined ? track_lots : existing.isBatched,
          isActive: is_active !== undefined ? is_active : existing.isActive,
          reorderPoint:
            reorder_point !== undefined ? reorder_point : existing.reorderPoint,
          version: existing.version + 1,
        },
      });

      if (barcode) {
        // Upsert barcode
        const existingBarcode = existing.barcodeMappings?.[0];
        if (existingBarcode) {
          await tx.barcodeMapping.update({
            where: { id: existingBarcode.id },
            data: { barcode, version: existingBarcode.version + 1 },
          });
        } else {
          await tx.barcodeMapping.create({
            data: { itemId: id, barcode, version: 1 },
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
