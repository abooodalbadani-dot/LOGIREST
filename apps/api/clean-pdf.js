const fs = require('fs');

const filePath = 'apps/api/src/modules/pdf/pdf-generator.service.ts';
let code = fs.readFileSync(filePath, 'utf8');

const originalLineEndings = code.includes('\r\n') ? '\r\n' : '\n';
code = code.replace(/\r\n/g, '\n');

// 1. Clean up duplicate setFont and getBaseCurrencyCode blocks
const oldHelpersDuplicate = `  private setFont(doc: PDFKit.PDFDocument, useBold = false) {
    const buffers = this.getFontBuffers();
    if (buffers) {
      doc.font(useBold ? buffers.bold : buffers.regular);
    } else {
      doc.font(useBold ? 'Helvetica-Bold' : 'Helvetica');
    }
  }

  private async getBaseCurrencyCode(): Promise<string> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'system_settings' },
      });
      if (setting?.value) {
        const parsed = JSON.parse(setting.value);
        return parsed.baseCurrency ?? parsed.base_currency ?? process.env.BASE_CURRENCY_CODE ?? 'SAR';
      }
    } catch {}
    return process.env.BASE_CURRENCY_CODE ?? 'SAR';
  }

  private setFont(doc: PDFKit.PDFDocument, useBold = false) {
    const buffers = this.getFontBuffers();
    if (buffers) {
      doc.font(useBold ? buffers.bold : buffers.regular);
    } else {
      doc.font(useBold ? 'Helvetica-Bold' : 'Helvetica');
    }
  }

  private async getBaseCurrencyCode(): Promise<string> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'system_settings' },
      });
      if (setting?.value) {
        const parsed = JSON.parse(setting.value);
        return parsed.baseCurrency ?? parsed.base_currency ?? process.env.BASE_CURRENCY_CODE ?? 'SAR';
      }
    } catch {}
    return process.env.BASE_CURRENCY_CODE ?? 'SAR';
  }`;

// Replace duplicates with a single, correctly-implemented setFont that returns doc to allow chaining
const correctHelpers = `  private setFont(doc: PDFKit.PDFDocument, useBold = false): PDFKit.PDFDocument {
    const buffers = this.getFontBuffers();
    if (buffers) {
      doc.font(useBold ? buffers.bold : buffers.regular);
    } else {
      doc.font(useBold ? 'Helvetica-Bold' : 'Helvetica');
    }
    return doc;
  }

  private async getBaseCurrencyCode(): Promise<string> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'system_settings' },
      });
      if (setting?.value) {
        const parsed = JSON.parse(setting.value);
        return parsed.baseCurrency ?? parsed.base_currency ?? process.env.BASE_CURRENCY_CODE ?? 'SAR';
      }
    } catch {}
    return process.env.BASE_CURRENCY_CODE ?? 'SAR';
  }`;

if (code.includes(oldHelpersDuplicate)) {
  code = code.replace(oldHelpersDuplicate, correctHelpers);
  console.log('Successfully cleaned up duplicates and fixed setFont returning type');
} else {
  // Let's also check if there is only a single block of duplicates that we need to replace or fix
  const singleHelperBlock = `  private setFont(doc: PDFKit.PDFDocument, useBold = false) {
    const buffers = this.getFontBuffers();
    if (buffers) {
      doc.font(useBold ? buffers.bold : buffers.regular);
    } else {
      doc.font(useBold ? 'Helvetica-Bold' : 'Helvetica');
    }
  }

  private async getBaseCurrencyCode(): Promise<string> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'system_settings' },
      });
      if (setting?.value) {
        const parsed = JSON.parse(setting.value);
        return parsed.baseCurrency ?? parsed.base_currency ?? process.env.BASE_CURRENCY_CODE ?? 'SAR';
      }
    } catch {}
    return process.env.BASE_CURRENCY_CODE ?? 'SAR';
  }`;
  if (code.includes(singleHelperBlock)) {
    code = code.replace(singleHelperBlock, correctHelpers);
    console.log('Successfully updated single helper block');
  } else {
    console.error('Could not find duplicate helpers or single helper block to replace!');
  }
}

// 2. Fix generateStocktakePdf to move const currencyCode out of Promise
// Let's find the start of generateStocktakePdf
const oldStocktakeStart = `  async generateStocktakePdf(
    id: string,
    locale: 'ar' | 'en' = 'en',
  ): Promise<Buffer> {
    try {
      const session = await this.prisma.stocktakeSession.findUnique({
        where: { id },
        include: {
          warehouse: true,
          counts: {
            include: {
              countedBy: {
                select: { name: true },
              },
            },
          },
          snapshots: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                },
              },
              lot: true,
            },
          },
        },
      });

      if (!session) {
        throw new NotFoundException(
          \`Stocktake Session with ID \${id} not found\`,
        );
      }

      return await new Promise<Buffer>((resolve, reject) => {`;

const newStocktakeStart = `  async generateStocktakePdf(
    id: string,
    locale: 'ar' | 'en' = 'en',
  ): Promise<Buffer> {
    try {
      const session = await this.prisma.stocktakeSession.findUnique({
        where: { id },
        include: {
          warehouse: true,
          counts: {
            include: {
              countedBy: {
                select: { name: true },
              },
            },
          },
          snapshots: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                },
              },
              lot: true,
            },
          },
        },
      });

      if (!session) {
        throw new NotFoundException(
          \`Stocktake Session with ID \${id} not found\`,
        );
      }

      const currencyCode = await this.getBaseCurrencyCode();

      return await new Promise<Buffer>((resolve, reject) => {`;

if (code.includes(oldStocktakeStart)) {
  code = code.replace(oldStocktakeStart, newStocktakeStart);
  console.log('Successfully moved currencyCode outside the Promise callback');
} else {
  console.error('Could not find generateStocktakePdf start signature in file!');
}

// Now let's remove "await" inside the Promise callback in generateStocktakePdf if it exists.
// The line inside is: const currencyCode = await this.getBaseCurrencyCode();
// We should remove this line because it is now defined outside the Promise.
const awaitCurrencyLine = '          const currencyCode = await this.getBaseCurrencyCode();';
if (code.includes(awaitCurrencyLine)) {
  code = code.replace(awaitCurrencyLine, '');
  console.log('Successfully removed internal await currencyCode declaration');
} else {
  console.warn('Did not find awaitCurrencyLine (maybe already removed or named differently)');
}

if (originalLineEndings === '\r\n') {
  code = code.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Finished clean-pdf execution');
