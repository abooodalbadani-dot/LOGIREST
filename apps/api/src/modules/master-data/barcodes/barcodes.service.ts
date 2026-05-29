import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class BarcodesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapDbBarcodeToFrontend(mapping: any) {
    return {
      id: mapping.id,
      item_id: mapping.itemId,
      uom_id: mapping.item?.uomId || '',
      code: mapping.barcode,
      default_qty: 1,
      is_active: true,
      version: mapping.version,
    };
  }

  async findAll() {
    const mappings = await this.prisma.barcodeMapping.findMany({
      include: { item: true },
      orderBy: { barcode: 'asc' },
    });
    return mappings.map(m => this.mapDbBarcodeToFrontend(m));
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

  async create(body: any, userId: string, ipAddress?: string) {
    const { item_id, code } = body;
    if (!item_id || !code) {
      throw new BadRequestException('item_id and code are required');
    }

    const existing = await this.prisma.barcodeMapping.findUnique({ where: { barcode: code } });
    if (existing) {
      throw new ConflictException(`Barcode "${code}" is already registered`);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const newMapping = await tx.barcodeMapping.create({
        data: {
          itemId: item_id,
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

  async update(id: string, body: any, userId: string, ipAddress?: string) {
    const existing = await this.prisma.barcodeMapping.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Barcode mapping with ID ${id} not found`);
    }

    if (body.version !== undefined && existing.version !== body.version) {
      throw new ConflictException('Optimistic locking failure: version mismatch');
    }

    const { item_id, code } = body;

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.barcodeMapping.update({
        where: { id },
        data: {
          itemId: item_id || existing.itemId,
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
    const existing = await this.prisma.barcodeMapping.findUnique({ where: { id } });
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
