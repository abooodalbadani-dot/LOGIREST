import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class UomService {
  constructor(private readonly prisma: PrismaService) {}

  private mapDbUoMToFrontend(uom: any) {
    return {
      id: uom.id,
      code: uom.code,
      name_ar: uom.name,
      name_en: uom.name,
      category: 'General',
      is_active: true,
      created_at: uom.createdAt || new Date().toISOString(),
      version: uom.version,
    };
  }

  async findAll() {
    const uoms = await this.prisma.unitOfMeasure.findMany({
      orderBy: { code: 'asc' },
    });
    const data = uoms.map((uom) => this.mapDbUoMToFrontend(uom));
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
    const uom = await this.prisma.unitOfMeasure.findUnique({
      where: { id },
    });
    if (!uom) {
      throw new NotFoundException(`Unit of Measure with ID ${id} not found`);
    }
    return this.mapDbUoMToFrontend(uom);
  }

  async create(body: any, userId: string, ipAddress?: string) {
    let { code } = body;
    const { name_en, name_ar } = body;
    if (!name_en && !name_ar) {
      throw new BadRequestException('name is required');
    }

    if (!code || code.trim() === '') {
      const allUoMs = await this.prisma.unitOfMeasure.findMany({
        where: {
          code: {
            startsWith: 'UOM-',
          },
        },
        select: {
          code: true,
        },
      });
      let maxNum = 0;
      for (const u of allUoMs) {
        const matches = u.code.match(/^UOM-(\d+)$/);
        if (matches) {
          const num = parseInt(matches[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
      code = `UOM-${String(maxNum + 1).padStart(4, '0')}`;
    } else {
      const existing = await this.prisma.unitOfMeasure.findUnique({
        where: { code },
      });
      if (existing) {
        throw new ConflictException(
          `Unit of Measure with code "${code}" already exists`,
        );
      }
    }

    const name = name_en || name_ar;

    const created = await this.prisma.$transaction(async (tx) => {
      const newUom = await tx.unitOfMeasure.create({
        data: {
          code,
          name,
          version: 1,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UOM_CREATED',
          targetTable: 'units_of_measure',
          targetId: newUom.id,
          beforeStateJson: '',
          afterStateJson: JSON.stringify(newUom),
          ipAddress: ipAddress || null,
        },
      });

      return newUom;
    });

    return this.mapDbUoMToFrontend(created);
  }

  async update(id: string, body: any, userId: string, ipAddress?: string) {
    const existing = await this.prisma.unitOfMeasure.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Unit of Measure with ID ${id} not found`);
    }

    if (body.version !== undefined && existing.version !== body.version) {
      throw new ConflictException(
        'Optimistic locking failure: version mismatch',
      );
    }

    const { code, name_en, name_ar } = body;
    const name = name_en || name_ar || existing.name;

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.unitOfMeasure.update({
        where: { id },
        data: {
          code: code || existing.code,
          name,
          version: existing.version + 1,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UOM_UPDATED',
          targetTable: 'units_of_measure',
          targetId: id,
          beforeStateJson: JSON.stringify(existing),
          afterStateJson: JSON.stringify(res),
          ipAddress: ipAddress || null,
        },
      });

      return res;
    });

    return this.mapDbUoMToFrontend(updated);
  }

  async remove(id: string, userId: string, ipAddress?: string) {
    const existing = await this.prisma.unitOfMeasure.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Unit of Measure with ID ${id} not found`);
    }

    if (existing.items.length > 0) {
      throw new BadRequestException(
        'Cannot delete Unit of Measure with associated items',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.unitOfMeasure.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UOM_DELETED',
          targetTable: 'units_of_measure',
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
