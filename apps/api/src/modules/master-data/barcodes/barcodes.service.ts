import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class BarcodesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapDbBarcodeToFrontend(mapping: {
    id: string;
    itemId: string;
    uomId?: string | null;
    barcode: string;
    version: number;
    item?: { uomId?: string; name?: string; sku?: string } | null;
  }) {
    return {
      id: mapping.id,
      itemId: mapping.itemId,
      uomId: mapping.uomId || mapping.item?.uomId || '',
      itemName: mapping.item?.name || '',
      itemCode: mapping.item?.sku || '',
      code: mapping.barcode,
      defaultQty: 1,
      isActive: true,
      version: mapping.version,
    };
  }

  async findAll() {
    const mappings = await this.prisma.barcodeMapping.findMany({
      include: { item: true },
      orderBy: { barcode: 'asc' },
    });
    const data = mappings.map((m) => this.mapDbBarcodeToFrontend(m));
    return {
      data,
      meta: {
        total: data.length,
        page: 1,
        pageSize: data.length || 1,
        totalPages: 1,
      },
    };
  }

  async findOne(id: string) {
    const mapping = await this.prisma.barcodeMapping.findUnique({
      where: { id },
      include: { item: true },
    });
    if (!mapping) {
      throw new NotFoundException(`Barcode mapping with ID ${id} not found`);
    }
    return this.mapDbBarcodeToFrontend(mapping);
  }

  async checkDuplicate(barcode: string) {
    if (!barcode) {
      throw new BadRequestException('barcode parameter is required');
    }
    const mapping = await this.prisma.barcodeMapping.findUnique({
      where: { barcode },
    });
    return { isDuplicate: !!mapping };
  }

  async create(
    body: { itemId: string; code: string; uomId?: string },
    userId: string,
    ipAddress?: string,
  ) {
    const { itemId, code, uomId } = body;
    if (!itemId || !code) {
      throw new BadRequestException('itemId and code are required');
    }

    const existing = await this.prisma.barcodeMapping.findUnique({
      where: { barcode: code },
    });
    if (existing) {
      throw new ConflictException(`Barcode "${code}" is already registered`);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const newMapping = await tx.barcodeMapping.create({
        data: {
          itemId: itemId,
          uomId: uomId || null,
          barcode: code,
          version: 1,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'BARCODE_CREATED',
          targetTable: 'barcode_mappings',
          targetId: newMapping.id,
          beforeStateJson: '',
          afterStateJson: JSON.stringify(newMapping),
          ipAddress: ipAddress || null,
        },
      });

      return newMapping;
    });

    return this.findOne(created.id);
  }

  async update(
    id: string,
    body: { itemId?: string; code?: string; uomId?: string; version?: number },
    userId: string,
    ipAddress?: string,
  ) {
    const existing = await this.prisma.barcodeMapping.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Barcode mapping with ID ${id} not found`);
    }

    if (body.version !== undefined && existing.version !== body.version) {
      throw new ConflictException(
        'Optimistic locking failure: version mismatch',
      );
    }

    const { itemId, code, uomId } = body;

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.barcodeMapping.update({
        where: { id },
        data: {
          itemId: itemId || existing.itemId,
          uomId: uomId !== undefined ? uomId : existing.uomId,
          barcode: code || existing.barcode,
          version: existing.version + 1,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'BARCODE_UPDATED',
          targetTable: 'barcode_mappings',
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
    const existing = await this.prisma.barcodeMapping.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Barcode mapping with ID ${id} not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.barcodeMapping.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'BARCODE_DELETED',
          targetTable: 'barcode_mappings',
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
