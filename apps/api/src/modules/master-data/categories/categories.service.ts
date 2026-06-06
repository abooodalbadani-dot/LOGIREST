import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapDbCategoryToFrontend(category: any) {
    return {
      id: category.id,
      code: category.name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
      name_ar: category.name,
      name_en: category.name,
      is_referenced: true,
      version: category.version,
    };
  }

  async findAll() {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    const data = categories.map((cat) => this.mapDbCategoryToFrontend(cat));
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
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return this.mapDbCategoryToFrontend(category);
  }

  async create(body: any, userId: string, ipAddress?: string) {
    const { name_en, name_ar } = body;
    const name = name_en || name_ar;
    if (!name) {
      throw new BadRequestException('name_en or name_ar is required');
    }

    const existing = await this.prisma.category.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException(
        `Category with name "${name}" already exists`,
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const newCat = await tx.category.create({
        data: {
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

  async update(id: string, body: any, userId: string, ipAddress?: string) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (body.version !== undefined && existing.version !== body.version) {
      throw new ConflictException(
        'Optimistic locking failure: version mismatch',
      );
    }

    const { name_en, name_ar } = body;
    const name = name_en || name_ar || existing.name;

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.category.update({
        where: { id },
        data: {
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
