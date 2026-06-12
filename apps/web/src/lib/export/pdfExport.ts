import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getExportBranding } from './exportBranding';
import { format } from 'date-fns';
import { getCairoFontBase64 } from './fontLoader';
import { reshapeArabicText } from './arabicShaper';

export interface PDFColumn {
  header: string;
  key: string;
  width?: number;
}

interface PDFExportOptions {
  scope?: string;
  generatedBy?: string;
}

/**
 * Detects text alignment based on content.
 * Arabic RTL strings -> right
 * Numbers and SKUs -> center/left
 */
function getAlignment(text: string): 'right' | 'left' | 'center' {
  if (!text) return 'left';
  
  // Arabic character range check
  if (/[\u0600-\u06FF\uFE70-\uFEFC]/.test(text)) {
    return 'right';
  }
  
  const clean = text.trim();
  // Numeric values, percentages, currencies
  if (/^\d+(\.\d+)?%?$/.test(clean) || /^[A-Z0-9-]+-\d+$/.test(clean)) {
    return 'center';
  }
  
  return 'left';
}

/**
 * Generates a professional PDF report with branding, watermark, and pagination.
 */
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
  const cairoBase64 = await getCairoFontBase64();
  const activeFont = cairoBase64 ? 'Cairo' : 'helvetica';
  
  if (cairoBase64) {
    doc.addFileToVFS('Cairo-Regular.ttf', cairoBase64);
    doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
  }
  doc.setFont(activeFont, 'normal');

  const headers = columns.map(col => col.header);
  const data = rows.map(row => 
    columns.map(col => {
      const val = row[col.key];
      if (val === null || val === undefined) return '';
      if (typeof val === 'boolean') return val ? 'Yes' : 'No';
      return String(val);
    })
  );

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Watermark Render (Low opacity 0.04)
  const addWatermark = (pdfDoc: jsPDF) => {
    if (branding?.logo) {
      try {
        pdfDoc.saveGraphicsState();
        // Set opacity strictly to 0.04
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
      
      const watermarkText = reshapeArabicText(branding?.name || 'LOGIREST');
      pdfDoc.text(watermarkText, pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 30,
      });
      pdfDoc.restoreGraphicsState();
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

    // Profile Text Block
    pdfDoc.setFontSize(15);
    pdfDoc.setTextColor(30, 41, 59); // Slate 800
    pdfDoc.setFont(activeFont, 'bold');
    pdfDoc.text(reshapeArabicText(branding?.name || 'LogiRest Enterprise'), pageWidth - 14, 15, { align: 'right' });

    pdfDoc.setFontSize(9);
    pdfDoc.setFont(activeFont, 'normal');
    pdfDoc.setTextColor(71, 85, 105); // Slate 600
    
    let currentY = 20;
    if (branding?.address) {
      pdfDoc.text(reshapeArabicText(branding.address), pageWidth - 14, currentY, { align: 'right' });
      currentY += 4.5;
    }

    const contactStr = `هاتف: ${branding?.phone || ''} | بريد: ${branding?.email || ''}`;
    pdfDoc.text(reshapeArabicText(contactStr), pageWidth - 14, currentY, { align: 'right' });
    currentY += 4.5;

    const taxCR: string[] = [];
    if (branding?.taxNumber) taxCR.push(`الرقم الضريبي: ${branding.taxNumber}`);
    if (branding?.commercialRegistration) taxCR.push(`سجل تجاري: ${branding.commercialRegistration}`);
    
    if (taxCR.length > 0) {
      pdfDoc.text(reshapeArabicText(taxCR.join(' | ')), pageWidth - 14, currentY, { align: 'right' });
      currentY += 4.5;
    }

    currentY += 2; // Spacing before title

    // Report Title
    pdfDoc.setFontSize(13);
    pdfDoc.setFont(activeFont, 'bold');
    pdfDoc.setTextColor(15, 118, 110); // Teal 700
    pdfDoc.text(reshapeArabicText(title), pageWidth - 14, currentY, { align: 'right' });
    currentY += 4.5;

    // Report Metadata
    pdfDoc.setFontSize(8.5);
    pdfDoc.setFont(activeFont, 'normal');
    pdfDoc.setTextColor(100, 116, 139); // Slate 500
    
    const metaParts = [`تاريخ التقرير: ${dateStr}`];
    if (options?.scope) {
      metaParts.push(`النطاق: ${options.scope}`);
    }
    pdfDoc.text(reshapeArabicText(metaParts.join(' | ')), pageWidth - 14, currentY, { align: 'right' });
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
      // Add watermark behind cells
      addWatermark(doc);
    },
    didParseCell: (cellData) => {
      const text = String(cellData.cell.raw || '');
      cellData.cell.text = [reshapeArabicText(text)];
      
      // Determine text alignments dynamically based on content type
      if (cellData.section === 'head') {
        cellData.cell.styles.halign = getAlignment(text);
      } else {
        cellData.cell.styles.halign = getAlignment(text);
      }
    }
  });

  // Second pass: Draw headers and footers with accurate total page count
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Draw header block on pages > 1 if they exist
    if (i > 1) {
      renderHeader(doc);
    }
    
    // Footer Block
    doc.setFont(activeFont, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    
    // Arabic page format "صفحة X من Y"
    const pageText = reshapeArabicText(`صفحة ${i} من ${totalPages}`);
    
    // User audit details
    const auditUser = options?.generatedBy ? `تم الإنشاء بواسطة: ${options.generatedBy}` : '';
    const auditScope = options?.scope ? `النطاق: ${options.scope}` : '';
    const auditText = reshapeArabicText([auditUser, auditScope].filter(Boolean).join(' | '));
    
    doc.text(pageText, 14, pageHeight - 10);
    if (auditText) {
      doc.text(auditText, pageWidth - 14, pageHeight - 10, { align: 'right' });
    }
  }

  doc.save(`${filename}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}
