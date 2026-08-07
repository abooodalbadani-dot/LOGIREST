import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';

interface CurrencyDto {
  code?: string;
  name?: string;
  isBase?: boolean;
  version?: number;
  symbol?: string;
  isActive?: boolean;
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
      name: currency.name,
      nameEn: currency.name,
      nameAr: currency.name,
      symbol: currency.symbol,
      isBase: currency.isBase,
      isActive: currency.isActive,
      createdAt: new Date().toISOString(),
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
    return this.prisma.$transaction(async (tx) => {
      if (data.isBase) {
        await tx.currency.updateMany({
          where: { isBase: true },
          data: { isBase: false },
        });
      }

      const currency = await tx.currency.create({
        data: {
          code: data.code ?? '',
          name: data.name ?? '',
          isBase: data.isBase ?? false,
          symbol: data.symbol,
          isActive: data.isBase ? true : (data.isActive ?? true),
        },
      });

      if (currency.isBase) {
        await tx.systemSetting.upsert({
          where: { key: 'system_settings' },
          create: { key: 'system_settings', value: JSON.stringify({ baseCurrency: currency.code }) },
          update: { value: JSON.stringify({ baseCurrency: currency.code }) },
        });
      }

      return this.mapDbCurrencyToFrontend(currency);
    });
  }

  async update(id: string, data: CurrencyDto) {
    return this.prisma.$transaction(async (tx) => {
      if (data.isBase) {
        await tx.currency.updateMany({
          where: { isBase: true, id: { not: id } },
          data: { isBase: false },
        });
      }

      const currency = await tx.currency.update({
        where: { id },
        data: {
          code: data.code,
          name: data.name,
          isBase: data.isBase,
          symbol: data.symbol,
          isActive: data.isBase ? true : data.isActive,
          version: data.version ? { increment: 1 } : undefined,
        },
      });

      if (currency.isBase) {
        await tx.systemSetting.upsert({
          where: { key: 'system_settings' },
          create: { key: 'system_settings', value: JSON.stringify({ baseCurrency: currency.code }) },
          update: { value: JSON.stringify({ baseCurrency: currency.code }) },
        });
      }

      return this.mapDbCurrencyToFrontend(currency);
    });
  }

  async remove(id: string) {
    await this.prisma.currency.delete({
      where: { id },
    });
    return { id };
  }
}
