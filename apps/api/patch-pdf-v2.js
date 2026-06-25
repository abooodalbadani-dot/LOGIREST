const fs = require('fs');

const filePath = 'apps/api/src/modules/pdf/pdf-generator.service.ts';
let code = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to \n temporarily for clean search and replace
const originalLineEndings = code.includes('\r\n') ? '\r\n' : '\n';
code = code.replace(/\r\n/g, '\n');

// Replace imports and formatArabic helper
const oldHeader = `import arabicReshaper from 'arabic-reshaper';
import bidi from 'bidi-js';

const bidiEngine = bidi();
const formatArabic = (text: string) => {
  if (!text) return text;
  const reshaped = arabicReshaper.convertArabic(text);
  const levels = bidiEngine.getEmbeddingLevels(reshaped, 'rtl');
  return bidiEngine.getReorderedString(reshaped, levels);
};`;

const newHeader = `import arabicReshaperLib from 'arabic-reshaper';
import bidiFactory from 'bidi-js';

const bidiEngine = bidiFactory();

const arabicReshaper = {
  reshape: (text: string) => {
    if (!text) return '';
    return arabicReshaperLib.convertArabic(text);
  }
};

const bidi = {
  getLogicalRun: (text: string, direction: 'rtl' | 'ltr' = 'rtl') => {
    if (!text) return '';
    const levels = bidiEngine.getEmbeddingLevels(text, direction);
    return bidiEngine.getReorderedString(text, levels);
  }
};

const formatArabic = (text: string) => {
  if (!text) return text;
  const readyText = bidi.getLogicalRun(arabicReshaper.reshape(text), 'rtl');
  return readyText;
};`;

if (code.includes(oldHeader)) {
  code = code.replace(oldHeader, newHeader);
  console.log('Successfully replaced oldHeader');
} else {
  console.error("Could not find oldHeader in file!");
}

// Insert class helper methods
const oldConstructor = `  constructor(private readonly prisma: PrismaService) { }`;
const newHelpers = `  constructor(private readonly prisma: PrismaService) { }

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

if (code.includes(oldConstructor)) {
  code = code.replace(oldConstructor, newHelpers);
  console.log('Successfully replaced oldConstructor');
} else {
  console.error("Could not find oldConstructor in file!");
}

// Replace font calls
code = code.replace(/doc\.font\('Cairo'\)/g, 'this.setFont(doc, false)');
code = code.replace(/doc\.font\('Cairo-Bold'\)/g, 'this.setFont(doc, true)');

// Replace currency code in generateStocktakePdf
const oldCurrencyLine = "const currencyCode = process.env.BASE_CURRENCY_CODE || '';";
if (code.includes(oldCurrencyLine)) {
  code = code.replace(oldCurrencyLine, 'const currencyCode = await this.getBaseCurrencyCode();');
  console.log('Successfully replaced oldCurrencyLine');
} else {
  console.error("Could not find oldCurrencyLine in file!");
}

// Restore line endings if they were originally CRLF
if (originalLineEndings === '\r\n') {
  code = code.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully patched pdf-generator.service.ts!');
