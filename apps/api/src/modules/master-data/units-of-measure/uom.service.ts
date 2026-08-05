import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';

interface UomDto {
  name?: string;
  isActive?: boolean;
  code?: string;
  name_en?: string;
  name_ar?: string;
  version?: number;
}

@Injectable()
export class UomService {
  constructor(private readonly prisma: PrismaService) {}

  private mapDbUoMToFrontend(
    uom: Prisma.UnitOfMeasureGetPayload<Record<string, never>>,
  ) {
    return {
      id: uom.id,
      code: uom.code,
      name: uom.name,
      name_ar: uom.name,
      name_en: uom.name,
      category: 'General',
      is_active: true,
      created_at: new Date().toISOString(),
      version: uom.version,
    };
  }

  async findAll(filters?: { search?: string; page?: string; limit?: string }) {
    const pageNum = filters?.page ? parseInt(filters.page, 10) : 1;
    const limitNum = Math.min(filters?.limit ? parseInt(filters.limit, 10) : 20, 50);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.UnitOfMeasureWhereInput = {};
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    const [uoms, total] = await Promise.all([
      this.prisma.unitOfMeasure.findMany({
        where,
        orderBy: { code: 'asc' },
        skip,
        take: limitNum,
      }),
      this.prisma.unitOfMeasure.count({ where }),
    ]);

    const data = uoms.map((uom) => this.mapDbUoMToFrontend(uom));
    return {
      data,
      meta: {
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
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

  async create(body: UomDto, userId: string, ipAddress?: string) {
    let { code } = body;
    const name_en = body.name_en;
    const name_ar = body.name_ar;
    if (!body.name && !name_en && !name_ar) {
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

    const name = body.name || name_en || name_ar;
    if (name) {
      const existingName = await this.prisma.unitOfMeasure.findFirst({
        where: { name: name.trim() },
      });
      if (existingName) {
        throw new ConflictException(
          `Unit of Measure with name "${name}" already exists`,
        );
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const newUom = await tx.unitOfMeasure.create({
        data: {
          code: code,
          name: name ?? '',
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

  async update(id: string, body: UomDto, userId: string, ipAddress?: string) {
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

    const code = body.code;
    const name_en = body.name_en;
    const name_ar = body.name_ar;
    const name = body.name || name_en || name_ar || existing.name;

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
