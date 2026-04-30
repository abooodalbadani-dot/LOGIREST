import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getExportBranding } from './exportBranding';
import { format } from 'date-fns';

export interface PDFColumn {
  header: string;
  key: string;
  width?: number;
}

/**
 * Generates a professional PDF report with branding, watermark, and pagination.
 */
export async function generatePDF(
  columns: PDFColumn[],
  rows: any[],
  filename: string,
  title: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const branding = getExportBranding();
  const dateStr = format(new Date(), 'yyyy-MM-dd HH:mm');
  const headers = columns.map(col => col.header);
  const data = rows.map(row => columns.map(col => row[col.key]));

  // Watermark Logic (Rendered on every page via autoTable hooks or manual loop)
  const addWatermark = (pdfDoc: jsPDF) => {
    pdfDoc.saveGraphicsState();
    pdfDoc.setGState(pdfDoc.GState({ opacity: 0.05 }));
    pdfDoc.setFontSize(60);
    pdfDoc.setTextColor(150);
    pdfDoc.setFont('helvetica', 'bold');
    
    // Rotated 30 degrees
    const pageWidth = pdfDoc.internal.pageSize.getWidth();
    const pageHeight = pdfDoc.internal.pageSize.getHeight();
    
    pdfDoc.text('LOGIREST ENTERPRISE', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 30,
    });
    pdfDoc.restoreGraphicsState();
  };

  // Header Rendering
  const renderHeader = (pdfDoc: jsPDF) => {
    const pageWidth = pdfDoc.internal.pageSize.getWidth();
    
    // Logo (if exists, would need base64 processing)
    if (branding?.logo) {
      try {
        pdfDoc.addImage(branding.logo, 'PNG', 14, 10, 30, 30);
      } catch (e) {
        console.warn('Failed to render logo in PDF', e);
      }
    }

    // Restaurant Name & Info
    pdfDoc.setFontSize(18);
    pdfDoc.setTextColor(33, 33, 33);
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.text(branding?.name || 'LogiRest Enterprise', 50, 20);

    pdfDoc.setFontSize(10);
    pdfDoc.setFont('helvetica', 'normal');
    pdfDoc.setTextColor(100);
    pdfDoc.text(branding?.address || '', 50, 26);
    pdfDoc.text(`Tel: ${branding?.phone || ''} | Email: ${branding?.email || ''}`, 50, 31);
    
    if (branding?.tax_number) {
      pdfDoc.text(`Tax No: ${branding.tax_number}`, 50, 36);
    }

    // Report Title
    pdfDoc.setFontSize(14);
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.setTextColor(0, 150, 150); // Cyan focus
    pdfDoc.text(title, 14, 50);
    
    pdfDoc.setFontSize(9);
    pdfDoc.setFont('helvetica', 'normal');
    pdfDoc.setTextColor(120);
    pdfDoc.text(`Generated on: ${dateStr}`, 14, 56);

    // Line separator
    pdfDoc.setDrawColor(200);
    pdfDoc.line(14, 60, pageWidth - 14, 60);
  };

  // Generate Table
  autoTable(doc, {
    startY: 65,
    head: [headers],
    body: data,
    theme: 'striped',
    headStyles: {
      fillColor: [0, 100, 100], // Dark Cyan
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50],
    },
    alternateRowStyles: {
      fillColor: [245, 250, 250],
    },
    margin: { top: 65, bottom: 20 },
    didDrawPage: (data) => {
      // Add watermark on each page
      addWatermark(doc);
      
      // Footer
      const str = 'Page ' + doc.internal.getNumberOfPages();
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(str, data.settings.margin.left, doc.internal.pageSize.getHeight() - 10);
      doc.text('LogiRest Enterprise Inventory System', doc.internal.pageSize.getWidth() - 60, doc.internal.pageSize.getHeight() - 10);
    },
  });

  // Since renderHeader is only on first page by startY, we can add it manually if needed for every page
  // But usuallybranding is only on first page. If every page, we use didDrawPage.
  // The user said "pagination (header/footer rendering)". Usually this implies simple page numbers.
  // I'll keep branding on page 1 only for now, unless it's a multi-page requirement for header too.
  
  // Re-render header on first page (since autoTable might overwrite or start below it)
  // Actually, we called renderHeader once. Let's move it into the main flow.
  renderHeader(doc);

  doc.save(`${filename}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}
