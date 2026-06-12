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

  async getPrintSettings(): Promise<{
    defaultPaperSize: 'A4' | '80mm' | '58mm';
    thermalShowLogo: boolean;
    autoPrintOnFulfill: boolean;
  }> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'system_settings' },
    });

    const defaultSettings = {
      defaultPaperSize: 'A4' as const,
      thermalShowLogo: true,
      autoPrintOnFulfill: false,
    };

    if (!setting?.value) {
      return defaultSettings;
    }

    try {
      const parsed = JSON.parse(setting.value) as Record<string, unknown>;
      const rawPrintObj = parsed.printSettings ?? parsed.print_settings;
      const printObj = typeof rawPrintObj === 'object' && rawPrintObj !== null
        ? (rawPrintObj as Record<string, unknown>)
        : {};

      const defaultPaperSizeVal = printObj.defaultPaperSize ?? printObj.default_paper_size;
      const thermalShowLogoVal = printObj.thermalShowLogo ?? printObj.thermal_show_logo;
      const autoPrintOnFulfillVal = printObj.autoPrintOnFulfill ?? printObj.auto_print_on_fulfill;

      return {
        defaultPaperSize: (typeof defaultPaperSizeVal === 'string' &&
        ['A4', '80mm', '58mm'].includes(defaultPaperSizeVal)
          ? defaultPaperSizeVal
          : defaultSettings.defaultPaperSize) as 'A4' | '80mm' | '58mm',
        thermalShowLogo: typeof thermalShowLogoVal === 'boolean'
          ? thermalShowLogoVal
          : defaultSettings.thermalShowLogo,
        autoPrintOnFulfill: typeof autoPrintOnFulfillVal === 'boolean'
          ? autoPrintOnFulfillVal
          : defaultSettings.autoPrintOnFulfill,
      };
    } catch (e: unknown) {
      this.logger.error(
        `Failed to parse print settings from DB: ${e instanceof Error ? e.message : String(e)}`,
      );
      return defaultSettings;
    }
  }
}
