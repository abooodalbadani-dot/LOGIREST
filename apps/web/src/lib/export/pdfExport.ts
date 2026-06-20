import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getExportBranding } from './exportBranding';
import { format } from 'date-fns';
import { getArabicFontBase64, getArabicBoldFontBase64 } from './fontLoader';
import { reshapeArabicText } from './arabicShaper';
import { translateToEnglish } from './translate';

export interface PDFColumn {
  header: string;
  key: string;
  width?: number;
}

interface PDFExportOptions {
  scope?: string;
  generatedBy?: string;
}

function hasArabic(text: string): boolean {
  return /[\u0600-\u06FF\uFE70-\uFEFC]/.test(text);
}

/**
 * Detects text alignment based on content and columns.
 * - Arabic fallbacks -> right
 * - Financial fields -> right
 * - Numeric / SKU fields -> center
 * - General English text -> left
 */
function getCellAlignment(
  text: string,
  columnKey: string | number,
  columnHeader: string
): 'left' | 'center' | 'right' {
  if (!text) return 'left';

  if (hasArabic(text)) {
    return 'right';
  }

  const keyLower = String(columnKey).toLowerCase();
  const headerLower = String(columnHeader).toLowerCase();

  // Financial columns keywords
  const financialKeywords = ['value', 'price', 'total', 'wac', 'cost', 'amount', 'rate', 'currency'];
  if (financialKeywords.some(k => keyLower.includes(k) || headerLower.includes(k))) {
    return 'right';
  }

  const clean = text.trim();
  const isNumeric = /^\d+(\.\d+)?%?$/.test(clean);
  const isSKU = /^[A-Z0-9-]+-\d+$/.test(clean) || keyLower.includes('sku') || headerLower.includes('sku');
  const isQty = keyLower.includes('qty') || headerLower.includes('quantity') || headerLower.includes('qty');

  if (isNumeric || isSKU || isQty) {
    return 'center';
  }

  return 'left';
}

export async function generatePDF(
  columns: PDFColumn[],
  rows: Record<string, unknown>[],
  filename: string,
  title: string,
  options?: PDFExportOptions
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const branding = getExportBranding();
  const dateStr = format(new Date(), 'yyyy-MM-dd HH:mm');

  // Base64 Font Setup
  const [arabicBase64, arabicBoldBase64] = await Promise.all([
    getArabicFontBase64(),
    getArabicBoldFontBase64(),
  ]);
  const activeFont = arabicBase64 ? 'Amiri' : 'helvetica';

  if (arabicBase64) {
    doc.addFileToVFS('Amiri-Regular.ttf', arabicBase64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal', 'Identity-H');
  }
  if (arabicBoldBase64) {
    doc.addFileToVFS('Amiri-Bold.ttf', arabicBoldBase64);
    doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold', 'Identity-H');
  }
  doc.setFont(activeFont, 'normal');

  // Translate all headers and cell values to English
  const headers = columns.map(col => translateToEnglish(col.header));
  const data = rows.map(row =>
    columns.map(col => {
      const val = row[col.key];
      if (val === null || val === undefined) return '';
      if (typeof val === 'boolean') return val ? 'Yes' : 'No';
      return translateToEnglish(String(val));
    })
  );

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Watermark Render (Low opacity 0.04)
  const addWatermark = (pdfDoc: jsPDF) => {
    if (branding?.logo) {
      try {
        pdfDoc.saveGraphicsState();
        pdfDoc.setGState(pdfDoc.GState({ opacity: 0.04 }));

        const size = 120; // 120mm x 120mm
        const x = (pageWidth - size) / 2;
        const y = (pageHeight - size) / 2;
        const imageFormat = branding.logo.includes('png') ? 'PNG' : 'JPEG';

        pdfDoc.addImage(branding.logo, imageFormat, x, y, size, size);
        pdfDoc.restoreGraphicsState();
      } catch (error) {
        console.warn('Failed to render logo watermark in PDF', error);
      }
    } else {
      // Fallback text watermark
      pdfDoc.saveGraphicsState();
      pdfDoc.setGState(pdfDoc.GState({ opacity: 0.04 }));
      pdfDoc.setFontSize(48);
      pdfDoc.setTextColor(150);
      pdfDoc.setFont(activeFont, 'bold');

      const watermarkTextRaw = branding?.name || 'OTANTIK RESTUARANT';
      const watermarkTextTranslated = translateToEnglish(watermarkTextRaw);
      const watermarkText = reshapeArabicText(watermarkTextTranslated);
      pdfDoc.text(watermarkText, pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 30,
      });
      pdfDoc.restoreGraphicsState();
    }
  };

  // Helper to draw a line of text in the header with correct translation and alignment
  const drawHeaderLine = (
    text: string,
    y: number,
    fontSize: number,
    isBold: boolean,
    textColor: [number, number, number],
    leftX: number
  ) => {
    const translated = translateToEnglish(text);
    doc.setFontSize(fontSize);
    doc.setFont(activeFont, isBold ? 'bold' : 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    if (hasArabic(translated)) {
      doc.text(reshapeArabicText(translated), pageWidth - 14, y, { align: 'right' });
    } else {
      doc.text(translated, leftX, y, { align: 'left' });
    }
  };

  // Header Render (Calculates final coordinate dynamically)
  const renderHeader = (pdfDoc: jsPDF): number => {
    // Logo layout
    if (branding?.logo) {
      try {
        const imageFormat = branding.logo.includes('png') ? 'PNG' : 'JPEG';
        pdfDoc.addImage(branding.logo, imageFormat, 14, 10, 24, 24);
      } catch (error) {
        console.warn('Failed to render header logo in PDF', error);
      }
    }

    const brandingLeftX = branding?.logo ? 42 : 14;

    // Profile Text Block - Branding Name
    const brandingName = branding?.name || 'Otantik Restaurant Enterprise';
    drawHeaderLine(brandingName, 15, 15, true, [30, 41, 59], brandingLeftX);

    let currentY = 20;
    if (branding?.address) {
      drawHeaderLine(branding.address, currentY, 9, false, [71, 85, 105], brandingLeftX);
      currentY += 4.5;
    }

    const contactStr = `هاتف: ${branding?.phone || ''} | بريد: ${branding?.email || ''}`;
    drawHeaderLine(contactStr, currentY, 9, false, [71, 85, 105], brandingLeftX);
    currentY += 4.5;

    const taxCR: string[] = [];
    if (branding?.taxNumber) taxCR.push(`الرقم الضريبي: ${branding.taxNumber}`);
    if (branding?.commercialRegistration) taxCR.push(`سجل تجاري: ${branding.commercialRegistration}`);

    if (taxCR.length > 0) {
      drawHeaderLine(taxCR.join(' | '), currentY, 9, false, [71, 85, 105], brandingLeftX);
      currentY += 4.5;
    }

    // Ensure title does not overlap with logo height (logo is 24mm high, placed at y = 10, ending at y = 34)
    if (branding?.logo && currentY < 37) {
      currentY = 37;
    } else {
      currentY += 2; // Spacing before title
    }

    // Report Title
    drawHeaderLine(title, currentY, 13, true, [15, 118, 110], 14);
    currentY += 4.5;

    // Report Metadata
    const metaParts = [`تاريخ التقرير: ${dateStr}`];
    if (options?.scope) {
      metaParts.push(`النطاق: ${options.scope}`);
    }
    drawHeaderLine(metaParts.join(' | '), currentY, 8.5, false, [100, 116, 139], 14);
    currentY += 3;

    // Line separator
    pdfDoc.setDrawColor(226, 232, 240); // Slate 200 (#e2e8f0)
    pdfDoc.setLineWidth(0.4);
    pdfDoc.line(14, currentY, pageWidth - 14, currentY);

    return currentY + 5; // Return next start Y coordinate
  };

  // Run header block on first page to get correct startY
  const startY = renderHeader(doc);

  // Generate Table
  autoTable(doc, {
    startY: startY,
    head: [headers],
    body: data,
    theme: 'plain',
    styles: {
      font: activeFont,
      fontSize: 8.5,
      textColor: [51, 65, 85], // Slate 700
      lineColor: [226, 232, 240], // Slate 200 (#e2e8f0)
      lineWidth: 0.1,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [15, 118, 110], // Teal 700
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate 50 (approx 2% grey)
    },
    margin: { top: 14, bottom: 20 },
    didDrawPage: () => {
      addWatermark(doc);
    },
    didParseCell: (cellData) => {
      const text = String(cellData.cell.raw || '');
      const translated = translateToEnglish(text);
      cellData.cell.text = [reshapeArabicText(translated)];

      const colIndex = cellData.column.index;
      const col = columns[colIndex];
      const colKey = col?.key || '';
      const colHeader = col?.header || '';

      cellData.cell.styles.halign = getCellAlignment(translated, colKey, colHeader);
    }
  });

  // Second pass: Draw headers and footers with accurate total page count
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    if (i > 1) {
      renderHeader(doc);
    }

    // Footer Block
    doc.setFont(activeFont, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // Slate 400

    const rawPageText = `صفحة ${i} من ${totalPages}`;
    const pageTextTranslated = translateToEnglish(rawPageText);

    const auditUser = options?.generatedBy ? `تم الإنشاء بواسطة: ${options.generatedBy}` : '';
    const auditScope = options?.scope ? `النطاق: ${options.scope}` : '';
    const rawAuditText = [auditUser, auditScope].filter(Boolean).join(' | ');
    const auditTextTranslated = translateToEnglish(rawAuditText);

    if (hasArabic(pageTextTranslated)) {
      doc.text(reshapeArabicText(pageTextTranslated), 14, pageHeight - 10);
    } else {
      doc.text(pageTextTranslated, pageWidth - 14, pageHeight - 10, { align: 'right' });
    }

    if (auditTextTranslated) {
      if (hasArabic(auditTextTranslated)) {
        doc.text(reshapeArabicText(auditTextTranslated), pageWidth - 14, pageHeight - 10, { align: 'right' });
      } else {
        doc.text(auditTextTranslated, 14, pageHeight - 10);
      }
    }
  }

  doc.save(`${filename}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}
