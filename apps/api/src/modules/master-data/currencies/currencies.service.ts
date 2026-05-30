import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class CurrenciesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapDbCurrencyToFrontend(currency: any) {
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
        page_size: data.length || 1,
        total_pages: 1,
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
}
