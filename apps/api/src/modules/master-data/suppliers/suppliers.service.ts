import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  private async getBaseCurrencyId(): Promise<string> {
    const base = await this.prisma.currency.findFirst({
      where: { isBase: true },
    });
    if (base) return base.id;
    const first = await this.prisma.currency.findFirst();
    return first ? first.id : 'sar-id';
  }

  private mapDbSupplierToFrontend(supplier: any, currencyId: string) {
    return {
      id: supplier.id,
      code: supplier.code,
      name_ar: supplier.name,
      name_en: supplier.name,
      email: supplier.contactEmail || '',
      phone: supplier.contactPhone || '',
      tax_number: '',
      currency_id: currencyId,
      payment_terms: 'NET_30',
      is_active: supplier.isActive,
      version: supplier.version,
    };
  }

  async findAll() {
    const currencyId = await this.getBaseCurrencyId();
    const suppliers = await this.prisma.supplier.findMany({
      orderBy: { code: 'asc' },
    });
    const data = suppliers.map((sup) =>
      this.mapDbSupplierToFrontend(sup, currencyId),
    );
    return {
      data,
      meta: {
        total: data.length,
        page: 1,
        page_size: data.length || 1,
        total_pages: 1,
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

  async create(body: any, userId: string, ipAddress?: string) {
    let { code } = body;
    const { name_en, name_ar, email, phone } = body;
    if (!name_en && !name_ar) {
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

    const name = name_en || name_ar;

    const created = await this.prisma.$transaction(async (tx) => {
      const newSup = await tx.supplier.create({
        data: {
          code,
          name,
          contactEmail: email || null,
          contactPhone: phone || null,
          isActive: body.is_active !== undefined ? body.is_active : true,
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

  async update(id: string, body: any, userId: string, ipAddress?: string) {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    if (body.version !== undefined && existing.version !== body.version) {
      throw new ConflictException(
        'Optimistic locking failure: version mismatch',
      );
    }

    const { code, name_en, name_ar, email, phone } = body;
    const name = name_en || name_ar || existing.name;

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.supplier.update({
        where: { id },
        data: {
          code: code || existing.code,
          name,
          contactEmail: email !== undefined ? email : existing.contactEmail,
          contactPhone: phone !== undefined ? phone : existing.contactPhone,
          isActive:
            body.is_active !== undefined ? body.is_active : existing.isActive,
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
