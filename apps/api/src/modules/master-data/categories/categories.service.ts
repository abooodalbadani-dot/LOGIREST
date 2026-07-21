import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';

interface CategoryDto {
  code?: string;
  name?: string;
  name_en?: string;
  name_ar?: string;
  version?: number;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapDbCategoryToFrontend(
    category: Prisma.CategoryGetPayload<Record<string, never>>,
  ) {
    return {
      id: category.id,
      code: category.code,
      name: category.name,
      name_ar: category.name,
      name_en: category.name,
      is_referenced: true,
      version: category.version,
    };
  }

  async findAll(filters?: { search?: string; page?: string; limit?: string }) {
    const pageNum = filters?.page ? parseInt(filters.page, 10) : 1;
    const limitNum = Math.min(filters?.limit ? parseInt(filters.limit, 10) : 20, 50);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.CategoryWhereInput = {};
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
      this.prisma.category.count({ where }),
    ]);

    const data = categories.map((cat) => this.mapDbCategoryToFrontend(cat));
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
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return this.mapDbCategoryToFrontend(category);
  }

  async create(body: CategoryDto, userId: string, ipAddress?: string) {
    const name = body.name || body.name_en || body.name_ar;
    if (!name) {
      throw new BadRequestException('name, name_en, or name_ar is required');
    }

    const existing = await this.prisma.category.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException(
        `Category with name "${name}" already exists`,
      );
    }

    if (!body.code) {
      throw new BadRequestException('code is required');
    }
    const code = body.code;

    const created = await this.prisma.$transaction(async (tx) => {
      const newCat = await tx.category.create({
        data: {
          code,
          name,
          version: 1,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CATEGORY_CREATED',
          targetTable: 'categories',
          targetId: newCat.id,
          beforeStateJson: '',
          afterStateJson: JSON.stringify(newCat),
          ipAddress: ipAddress || null,
        },
      });

      return newCat;
    });

    return this.mapDbCategoryToFrontend(created);
  }

  async update(
    id: string,
    body: CategoryDto,
    userId: string,
    ipAddress?: string,
  ) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (body.version !== undefined && existing.version !== body.version) {
      throw new ConflictException(
        'Optimistic locking failure: version mismatch',
      );
    }

    const name = body.name || body.name_en || body.name_ar || existing.name;

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.category.update({
        where: { id },
        data: {
          code: body.code || existing.code,
          name,
          version: existing.version + 1,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CATEGORY_UPDATED',
          targetTable: 'categories',
          targetId: id,
          beforeStateJson: JSON.stringify(existing),
          afterStateJson: JSON.stringify(res),
          ipAddress: ipAddress || null,
        },
      });

      return res;
    });

    return this.mapDbCategoryToFrontend(updated);
  }

  async remove(id: string, userId: string, ipAddress?: string) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (existing.items.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with associated items',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.category.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CATEGORY_DELETED',
          targetTable: 'categories',
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
