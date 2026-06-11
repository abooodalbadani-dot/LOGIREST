import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const CURRENCY_SYMBOLS: Record<string, string> = {
  SAR: '\uFDFC',
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  AED: '\u062F.\u0625',
  QAR: '\u0631.\u0642',
  KWD: '\u062F.\u0643',
  BHD: '\u062F.\u0628',
  OMR: '\u0631.\u0639',
  EGP: '\u00A3',
  TRY: '\u20BA',
  PKR: '\u20A8',
  INR: '\u20B9',
  CNY: '\u00A5',
  JPY: '\u00A5',
  KRW: '\u20A9',
};

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getBaseCurrency(): Promise<{ baseCurrency: string; symbol: string }> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'system_settings' },
    });

    const code = setting?.value
      ? (() => {
          try {
            const parsed = JSON.parse(setting.value);
            return (parsed.baseCurrency ?? parsed.base_currency) as
              | string
              | undefined;
          } catch {
            return undefined;
          }
        })()
      : undefined;

    const baseCurrency = code || process.env.BASE_CURRENCY_CODE || 'SAR';
    const symbol = CURRENCY_SYMBOLS[baseCurrency] ?? baseCurrency;

    return { baseCurrency, symbol };
  }
}
