import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';

interface CurrencyDto {
  code?: string;
  name_en?: string;
  name_ar?: string;
  is_base_currency?: boolean;
  version?: number;
}

@Injectable()
export class CurrenciesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapDbCurrencyToFrontend(
    currency: Prisma.CurrencyGetPayload<Record<string, never>>,
  ) {
    return {
      id: currency.id,
      code: currency.code,
      name_ar: currency.name,
      name_en: currency.name,
      symbol:
        currency.code === 'SAR'
          ? 'ر.س'
          : currency.code === 'USD'
            ? '$'
            : currency.code,
      is_base_currency: currency.isBase,
      is_active: true,
      created_at: new Date().toISOString(),
      version: currency.version,
    };
  }

  async findAll() {
    const currencies = await this.prisma.currency.findMany({
      orderBy: { code: 'asc' },
    });
    const data = currencies.map((c) => this.mapDbCurrencyToFrontend(c));
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
    const currency = await this.prisma.currency.findUnique({
      where: { id },
    });
    if (!currency) {
      throw new NotFoundException(`Currency with ID ${id} not found`);
    }
    return this.mapDbCurrencyToFrontend(currency);
  }

  async create(data: CurrencyDto) {
    if (data.is_base_currency) {
      await this.prisma.currency.updateMany({
        where: { isBase: true },
        data: { isBase: false },
      });
    }

    const currency = await this.prisma.currency.create({
      data: {
        code: data.code ?? '',
        name: data.name_en ?? data.name_ar ?? '',
        isBase: data.is_base_currency ?? false,
      },
    });
    return this.mapDbCurrencyToFrontend(currency);
  }

  async update(id: string, data: CurrencyDto) {
    if (data.is_base_currency) {
      await this.prisma.currency.updateMany({
        where: { isBase: true },
        data: { isBase: false },
      });
    }

    const currency = await this.prisma.currency.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name_en || data.name_ar || '',
        isBase: data.is_base_currency,
        version: data.version ? { increment: 1 } : undefined,
      },
    });
    return this.mapDbCurrencyToFrontend(currency);
  }

  async remove(id: string) {
    await this.prisma.currency.delete({
      where: { id },
    });
    return { id };
  }
}
