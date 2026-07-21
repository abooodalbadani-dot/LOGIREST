import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';

interface SupplierDto {
  code?: string;
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactName?: string;
  paymentTerms?: string;
  isActive?: boolean;
  version?: number;
}

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) { }

  private async getBaseCurrencyId(): Promise<string> {
    const base = await this.prisma.currency.findFirst({
      where: { isBase: true },
    });
    if (base) return base.id;
    const first = await this.prisma.currency.findFirst();
    return first ? first.id : 'sar-id';
  }

  private mapDbSupplierToFrontend(
    supplier: Prisma.SupplierGetPayload<Record<string, never>>,
    currencyId: string,
  ) {
    return {
      id: supplier.id,
      code: supplier.code,
      name: supplier.name,
      contactEmail: supplier.contactEmail || '',
      contactPhone: supplier.contactPhone || '',
      contactName: supplier.contactName || '',
      currencyId: currencyId,
      paymentTerms: ((supplier as Record<string, unknown>).paymentTerms as string) || 'NET_30',
      isActive: supplier.isActive,
      version: supplier.version,
    };
  }

  async findAll(filters?: { search?: string; page?: string; limit?: string }) {
    const pageNum = filters?.page ? parseInt(filters.page, 10) : 1;
    const limitNum = Math.min(filters?.limit ? parseInt(filters.limit, 10) : 20, 50);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.SupplierWhereInput = {};
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const currencyId = await this.getBaseCurrencyId();
    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: { code: 'asc' },
        skip,
        take: limitNum,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    const data = suppliers.map((sup) =>
      this.mapDbSupplierToFrontend(sup, currencyId),
    );
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
    const currencyId = await this.getBaseCurrencyId();
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    return this.mapDbSupplierToFrontend(supplier, currencyId);
  }

  async create(body: SupplierDto, userId: string, ipAddress?: string) {
    let { code } = body;
    const { name, contactEmail, contactPhone, contactName } = body;
    if (!name) {
      throw new BadRequestException('name is required');
    }

    if (!code || code.trim() === '') {
      const allSuppliers = await this.prisma.supplier.findMany({
        where: {
          code: {
            startsWith: 'SUP-',
          },
        },
        select: {
          code: true,
        },
      });
      let maxNum = 0;
      for (const s of allSuppliers) {
        const matches = s.code.match(/^SUP-(\d+)$/);
        if (matches) {
          const num = parseInt(matches[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
      code = `SUP-${String(maxNum + 1).padStart(4, '0')}`;
    } else {
      const existing = await this.prisma.supplier.findUnique({
        where: { code },
      });
      if (existing) {
        throw new ConflictException(
          `Supplier with code "${code}" already exists`,
        );
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const newSup = await tx.supplier.create({
        data: {
          code: code,
          name: name,
          contactEmail: contactEmail || null,
          contactPhone: contactPhone || null,
          contactName: contactName || null,
          paymentTerms: body.paymentTerms || 'NET_30',
          isActive: body.isActive !== undefined ? body.isActive : true,
          version: 1,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'SUPPLIER_CREATED',
          targetTable: 'suppliers',
          targetId: newSup.id,
          beforeStateJson: '',
          afterStateJson: JSON.stringify(newSup),
          ipAddress: ipAddress || null,
        },
      });

      return newSup;
    });

    const currencyId = await this.getBaseCurrencyId();
    return this.mapDbSupplierToFrontend(created, currencyId);
  }

  async update(
    id: string,
    body: SupplierDto,
    userId: string,
    ipAddress?: string,
  ) {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    if (body.version !== undefined && existing.version !== body.version) {
      throw new ConflictException(
        'Optimistic locking failure: version mismatch',
      );
    }

    const { code, name, contactEmail, contactPhone, contactName } = body;

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.supplier.update({
        where: { id },
        data: {
          code: code || existing.code,
          name: name || existing.name,
          contactEmail:
            contactEmail !== undefined ? contactEmail : existing.contactEmail,
          contactPhone:
            contactPhone !== undefined ? contactPhone : existing.contactPhone,
          contactName:
            contactName !== undefined ? contactName : existing.contactName,
          paymentTerms:
            body.paymentTerms !== undefined ? body.paymentTerms : existing.paymentTerms,
          isActive:
            body.isActive !== undefined ? body.isActive : existing.isActive,
          version: existing.version + 1,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'SUPPLIER_UPDATED',
          targetTable: 'suppliers',
          targetId: id,
          beforeStateJson: JSON.stringify(existing),
          afterStateJson: JSON.stringify(res),
          ipAddress: ipAddress || null,
        },
      });

      return res;
    });

    const currencyId = await this.getBaseCurrencyId();
    return this.mapDbSupplierToFrontend(updated, currencyId);
  }

  async remove(id: string, userId: string, ipAddress?: string) {
    const existing = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    if (existing.purchaseOrders.length > 0) {
      throw new BadRequestException(
        'Cannot delete supplier with associated purchase orders',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.supplier.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'SUPPLIER_DELETED',
          targetTable: 'suppliers',
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
