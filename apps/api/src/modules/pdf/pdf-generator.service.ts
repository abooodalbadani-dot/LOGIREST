import { Injectable, NotFoundException } from '@nestjs/common';
import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../../database/prisma.service';
import { otantikBase64Logo } from './logo-base64';
import { getDocumentTitle } from '@logirest/shared-types';

@Injectable()
export class PdfGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  private async getBaseCurrencyCode(): Promise<string> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'system_settings' },
      });
      if (setting?.value) {
        const parsed = JSON.parse(setting.value);
        return (
          parsed.baseCurrency ??
          parsed.base_currency ??
          process.env.BASE_CURRENCY_CODE ??
          ''
        );
      }
    } catch (e) {
      console.warn(
        'Failed to retrieve base currency setting, using default:',
        e,
      );
    }
    return process.env.BASE_CURRENCY_CODE ?? '';
  }

  private async getRestaurantLogoHtml(): Promise<string> {
    const fallback = `<img src="${otantikBase64Logo}" alt="Restaurant Logo" />`;
    try {
      const profileSetting = await this.prisma.systemSetting.findUnique({
        where: { key: 'restaurant_profile' },
      });
      if (!profileSetting?.value) {
        return fallback;
      }
      const parsed = JSON.parse(profileSetting.value);
      const logoUrl: string | undefined = parsed.logoUrl ?? parsed.logo;
      if (!logoUrl) {
        return fallback;
      }

      const trimmedLogo = logoUrl.trim();
      if (trimmedLogo.startsWith('<svg') || trimmedLogo.startsWith('<?xml')) {
        return trimmedLogo;
      }

      if (trimmedLogo.startsWith('data:image/svg+xml')) {
        try {
          const base64Data = trimmedLogo.split('base64,')[1];
          if (base64Data) {
            const rawSvg = Buffer.from(base64Data, 'base64').toString('utf-8');
            const svgIndex = rawSvg.toLowerCase().indexOf('<svg');
            if (svgIndex !== -1) {
              return rawSvg.substring(svgIndex);
            }
          }
        } catch (e) {
          console.warn('Failed to parse base64 SVG data:', e);
        }
      }

      if (trimmedLogo.startsWith('data:image/')) {
        return `<img src="${trimmedLogo}" alt="Restaurant Logo" />`;
      }

      const rootDir = process.cwd().includes('apps')
        ? path.join(process.cwd(), '..', '..')
        : process.cwd();
      const uploadsDir = path.join(rootDir, 'apps', 'web', 'public', 'uploads');

      let relativePath: string | undefined;
      if (logoUrl.includes('/uploads/')) {
        relativePath = logoUrl.split('/uploads/')[1];
      } else if (logoUrl.includes('/api/v1/uploads/')) {
        relativePath = logoUrl.split('/api/v1/uploads/')[1];
      }

      if (relativePath) {
        const fullPath = path.join(uploadsDir, relativePath);
        if (fs.existsSync(fullPath)) {
          const ext = path.extname(fullPath).toLowerCase();
          if (ext === '.svg') {
            const rawSvg = fs.readFileSync(fullPath, 'utf-8');
            const svgIndex = rawSvg.toLowerCase().indexOf('<svg');
            if (svgIndex !== -1) {
              return rawSvg.substring(svgIndex);
            }
          }
          const buffer = fs.readFileSync(fullPath);
          let mimeType = 'image/png';
          if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
          else if (ext === '.webp') mimeType = 'image/webp';
          else if (ext === '.gif') mimeType = 'image/gif';
          return `<img src="data:${mimeType};base64,${buffer.toString('base64')}" alt="Restaurant Logo" />`;
        }
      }

      if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
        try {
          const response = await fetch(logoUrl);
          if (response.ok) {
            const contentType = response.headers.get('content-type') || '';
            if (
              contentType.includes('image/svg+xml') ||
              logoUrl.toLowerCase().endsWith('.svg')
            ) {
              const rawSvg = await response.text();
              const svgIndex = rawSvg.toLowerCase().indexOf('<svg');
              if (svgIndex !== -1) {
                return rawSvg.substring(svgIndex);
              }
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            const finalContentType = contentType || 'image/png';
            return `<img src="data:${finalContentType};base64,${buffer.toString('base64')}" alt="Restaurant Logo" />`;
          }
        } catch (fetchErr) {
          console.warn(`Failed to fetch remote logo url ${logoUrl}:`, fetchErr);
        }
      }
    } catch (err) {
      console.warn('Failed to retrieve or convert restaurant logo:', err);
    }
    return fallback;
  }

  private formatCurrency(value: number, currencyCode: string): string {
    return `${Number(value).toFixed(2)} ${currencyCode}`;
  }

  private formatDate(date: Date | string | null): string {
    if (!date) return '—';
    const d = new Date(date);
    return d.toISOString().replace('T', ' ').substring(0, 16);
  }

  private async renderHtmlToPdf(htmlString: string): Promise<Buffer> {
    const executablePath = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
    const isDocker = fs.existsSync(executablePath);

    const browser = await chromium.launch({
      headless: true,
      executablePath: isDocker ? executablePath : undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(htmlString, { waitUntil: 'load' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          bottom: '15mm',
          left: '15mm',
          right: '15mm',
        },
      });
      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  private wrapHtml(
    title: string,
    locale: 'ar' | 'en',
    detailsHtml: string,
    contentHtml: string,
    summaryHtml: string = '',
    logoHtml: string = `<img src="${otantikBase64Logo}" alt="Restaurant Logo" />`,
  ): string {
    const isAr = locale === 'ar';
    const direction = isAr ? 'rtl' : 'ltr';
    const dateStr = this.formatDate(new Date());

    return `<!DOCTYPE html>
<html dir="${direction}" lang="${locale}">
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
    
    :root {
      --primary-navy: #0B1220;
      --accent-gold: #b48e67;
      --border-light: #e5e7eb;
      --text-muted: #64748b;
      --bg-light: #f9fafb;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Cairo', 'Tajawal', sans-serif;
      margin: 0;
      padding: 0;
      color: var(--primary-navy);
      background-color: #ffffff;
      font-size: 9.5pt;
      line-height: 1.5;
    }
    
    header {
      width: 100%;
      margin-bottom: 20px;
      border-bottom: 2px solid var(--accent-gold);
      padding-bottom: 12px;
    }
    
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .logo-container {
      width: 180px;
      height: 65px;
    }
    
    .logo-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
    }
    
    .logo-container svg {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }
    
    .title-container {
      text-align: ${isAr ? 'left' : 'right'};
    }
    
    .document-title {
      font-size: 15pt;
      font-weight: 700;
      color: var(--accent-gold);
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .document-meta {
      font-size: 8.5pt;
      color: var(--text-muted);
      margin-top: 4px;
    }
    
    .details-strip {
      display: flex;
      justify-content: space-between;
      gap: 15px;
      margin-bottom: 20px;
      background-color: var(--bg-light);
      border: 1px solid var(--border-light);
      border-radius: 6px;
      padding: 12px;
    }
    
    .details-column {
      flex: 1;
    }
    
    .details-column-title {
      font-weight: 700;
      font-size: 8.5pt;
      color: var(--accent-gold);
      border-bottom: 1.5px solid var(--accent-gold);
      padding-bottom: 3px;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    
    .details-row {
      margin-bottom: 4px;
      font-size: 8.5pt;
    }
    
    .details-label {
      font-weight: 600;
      color: var(--text-muted);
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    th {
      background-color: var(--primary-navy);
      color: #ffffff;
      padding: 6px 8px;
      font-size: 8.5pt;
      font-weight: 700;
      text-align: ${isAr ? 'right' : 'left'};
      border-bottom: 2px solid var(--accent-gold);
    }
    
    td {
      padding: 6px 8px;
      font-size: 8.5pt;
      border-bottom: 1px solid var(--border-light);
      text-align: ${isAr ? 'right' : 'left'};
      vertical-align: middle;
    }
    
    tr:nth-child(even) td {
      background-color: #fafbfc;
    }
    
    .align-center {
      text-align: center !important;
    }
    
    .align-left {
      text-align: left !important;
    }
    
    .align-right {
      text-align: right !important;
    }
    
    .notes-box {
      margin-bottom: 15px;
      padding: 10px;
      background-color: var(--bg-light);
      border-left: 3px solid var(--accent-gold);
      font-size: 8.5pt;
    }
    
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 15px;
    }
    
    .summary-box {
      border: 1.5px solid var(--accent-gold);
      border-radius: 6px;
      padding: 10px 12px;
      min-width: 220px;
      background-color: var(--bg-light);
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      margin-bottom: 4px;
    }
    
    .summary-row.total {
      font-size: 10pt;
      font-weight: 700;
      color: var(--primary-navy);
      border-top: 1.5px solid var(--accent-gold);
      padding-top: 4px;
      margin-top: 4px;
      margin-bottom: 0;
    }
    
    footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: var(--text-muted);
      border-top: 1px solid var(--border-light);
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <header>
    <div class="header-top">
      <div class="logo-container">
        ${logoHtml}
      </div>
      <div class="title-container">
        <h1 class="document-title">${title}</h1>
        <div class="document-meta">
          <div>${isAr ? 'تاريخ الطباعة' : 'Printed Date'}: ${dateStr}</div>
        </div>
      </div>
    </div>
  </header>
  
  <div class="details-strip">
    ${detailsHtml}
  </div>
  
  <main>
    ${contentHtml}
  </main>
  
  ${summaryHtml ? `<div class="summary-section">${summaryHtml}</div>` : ''}
  
  <footer>
    <div>${isAr ? 'نظام إدارة مخزون مطابخ أوتانتيك' : 'Otantik Kitchen Inventory Management System'}</div>
    <div>${isAr ? 'وثيقة داخلية' : 'Internal Document'}</div>
  </footer>
</body>
</html>`;
  }

  async generatePurchaseOrderPdf(
    id: string,
    locale: 'ar' | 'en' = 'en',
  ): Promise<Buffer> {
    try {
      const po = await this.prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          supplier: true,
          warehouse: true,
          currency: true,
          lines: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                },
              },
            },
          },
        },
      });

      if (!po) {
        throw new NotFoundException(`Purchase Order with ID ${id} not found`);
      }

      const isAr = locale === 'ar';
      const currency = po.currency?.code || '';

      const title = getDocumentTitle('po', locale);

      const detailsHtml = `
        <div class="details-column">
          <div class="details-column-title">${isAr ? 'المورد' : 'Supplier'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'الاسم' : 'Name'}:</span> ${po.supplier?.name || '—'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'الكود' : 'Code'}:</span> ${po.supplier?.code || '—'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'البريد الالكتروني' : 'Email'}:</span> ${po.supplier?.contactEmail || '—'}</div>
        </div>
        <div class="details-column">
          <div class="details-column-title">${isAr ? 'التسليم إلى' : 'Ship To'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'المستودع' : 'Warehouse'}:</span> ${po.warehouse?.name || '—'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'رقم المستند' : 'Doc No'}:</span> ${po.poNumber}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'الحالة' : 'Status'}:</span> ${po.status}</div>
        </div>
      `;

      let totalSum = 0;
      let rowsHtml = '';

      for (const line of po.lines) {
        const lineTotal = Number(line.quantity) * Number(line.unitPrice);
        totalSum += lineTotal;
        rowsHtml += `
          <tr>
            <td>${line.item?.sku || '—'}</td>
            <td>
              <div style="font-weight: 600;">${line.item?.name || '—'}</div>
            </td>
            <td class="align-center">${Number(line.quantity)}</td>
            <td class="align-center">${line.item?.unitOfMeasure?.code || '—'}</td>
            <td class="align-right">${Number(line.unitPrice).toFixed(2)}</td>
            <td class="align-right">${lineTotal.toFixed(2)}</td>
          </tr>
        `;
      }

      const contentHtml = `
        <table>
          <thead>
            <tr>
              <th style="width: 15%;">${isAr ? 'كود الصنف' : 'SKU'}</th>
              <th style="width: 45%;">${isAr ? 'اسم الصنف' : 'Description'}</th>
              <th style="width: 10%;" class="align-center">${isAr ? 'الكمية' : 'Qty'}</th>
              <th style="width: 10%;" class="align-center">${isAr ? 'الوحدة' : 'UoM'}</th>
              <th style="width: 10%;" class="align-right">${isAr ? 'السعر' : 'Price'}</th>
              <th style="width: 10%;" class="align-right">${isAr ? 'الإجمالي' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      const summaryHtml = `
        <div class="summary-box">
          <div class="summary-row total">
            <span>${isAr ? 'إجمالي القيمة' : 'Total PO Value'}:</span>
            <span>${this.formatCurrency(totalSum, currency)}</span>
          </div>
        </div>
      `;

      const logoHtml = await this.getRestaurantLogoHtml();
      const html = this.wrapHtml(
        title,
        locale,
        detailsHtml,
        contentHtml,
        summaryHtml,
        logoHtml,
      );
      return await this.renderHtmlToPdf(html);
    } catch (error) {
      console.error(`Error generating PO PDF for ID ${id}:`, error);
      throw error;
    }
  }

  async generateTransferPdf(
    id: string,
    locale: 'ar' | 'en' = 'en',
  ): Promise<Buffer> {
    try {
      const transfer = await this.prisma.transfer.findUnique({
        where: { id },
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          lines: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                },
              },
            },
          },
        },
      });

      if (!transfer) {
        throw new NotFoundException(
          `Transfer document with ID ${id} not found`,
        );
      }

      const isAr = locale === 'ar';
      const title = getDocumentTitle('transfer', locale);

      const detailsHtml = `
        <div class="details-column">
          <div class="details-column-title">${isAr ? 'المستودع المصدر' : 'From Warehouse'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'الاسم' : 'Name'}:</span> ${transfer.fromWarehouse?.name || '—'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'الكود' : 'Code'}:</span> ${transfer.fromWarehouse?.code || '—'}</div>
        </div>
        <div class="details-column">
          <div class="details-column-title">${isAr ? 'المستودع الوجهة' : 'To Warehouse'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'الاسم' : 'Name'}:</span> ${transfer.toWarehouse?.name || '—'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'الكود' : 'Code'}:</span> ${transfer.toWarehouse?.code || '—'}</div>
        </div>
        <div class="details-column">
          <div class="details-column-title">${isAr ? 'معلومات التحويل' : 'Transfer Info'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'رقم المستند' : 'Doc No'}:</span> ${transfer.transferNumber}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'التاريخ' : 'Date'}:</span> ${this.formatDate(transfer.createdAt)}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'الحالة' : 'Status'}:</span> ${transfer.status}</div>
        </div>
      `;

      let rowsHtml = '';
      for (const line of transfer.lines) {
        rowsHtml += `
          <tr>
            <td>${line.item?.sku || '—'}</td>
            <td>
              <div style="font-weight: 600;">${line.item?.name || '—'}</div>
            </td>
            <td class="align-center">${line.item?.unitOfMeasure?.code || '—'}</td>
            <td class="align-center">${Number(line.quantityShipped)}</td>
            <td class="align-center">${line.quantityReceived !== null ? Number(line.quantityReceived) : '—'}</td>
          </tr>
        `;
      }

      let contentHtml = '';
      if (transfer.notes) {
        contentHtml += `
          <div class="notes-box">
            <strong>${isAr ? 'ملاحظات' : 'Notes'}:</strong> ${transfer.notes}
          </div>
        `;
      }

      contentHtml += `
        <table>
          <thead>
            <tr>
              <th style="width: 15%;">${isAr ? 'كود الصنف' : 'SKU'}</th>
              <th style="width: 45%;">${isAr ? 'اسم الصنف' : 'Description'}</th>
              <th style="width: 10%;" class="align-center">${isAr ? 'الوحدة' : 'UoM'}</th>
              <th style="width: 15%;" class="align-center">${isAr ? 'الكمية المرسلة' : 'Qty Shipped'}</th>
              <th style="width: 15%;" class="align-center">${isAr ? 'الكمية المستلمة' : 'Qty Received'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      const logoHtml = await this.getRestaurantLogoHtml();
      const html = this.wrapHtml(
        title,
        locale,
        detailsHtml,
        contentHtml,
        '',
        logoHtml,
      );
      return await this.renderHtmlToPdf(html);
    } catch (error) {
      console.error(`Error generating Transfer PDF for ID ${id}:`, error);
      throw error;
    }
  }

  async generateGrnPdf(
    id: string,
    locale: 'ar' | 'en' = 'en',
  ): Promise<Buffer> {
    try {
      const grn = await this.prisma.goodsReceivedNote.findUnique({
        where: { id },
        include: {
          warehouse: true,
          purchaseOrder: {
            include: {
              supplier: true,
              currency: true,
            },
          },
          lines: {
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

      if (!grn) {
        throw new NotFoundException(
          `Goods Received Note with ID ${id} not found`,
        );
      }

      const isAr = locale === 'ar';
      const currency = grn.purchaseOrder?.currency?.code || '';
      const title = getDocumentTitle('grn', locale);

      const detailsHtml = `
        <div class="details-column">
          <div class="details-column-title">${isAr ? 'المورد' : 'Supplier'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'الاسم' : 'Name'}:</span> ${grn.purchaseOrder?.supplier?.name || '—'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'الكود' : 'Code'}:</span> ${grn.purchaseOrder?.supplier?.code || '—'}</div>
        </div>
        <div class="details-column">
          <div class="details-column-title">${isAr ? 'التسليم إلى' : 'Ship To'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'المستودع' : 'Warehouse'}:</span> ${grn.warehouse?.name || '—'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'الكود' : 'Code'}:</span> ${grn.warehouse?.code || '—'}</div>
        </div>
        <div class="details-column">
          <div class="details-column-title">${isAr ? 'معلومات السند' : 'Receipt Info'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'رقم السند' : 'GRN No'}:</span> ${grn.grnNumber}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'مرجع أمر الشراء' : 'PO Ref'}:</span> ${grn.purchaseOrder?.poNumber || '—'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'الحالة' : 'Status'}:</span> ${grn.status}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'تاريخ الترحيل' : 'Posted At'}:</span> ${grn.postedAt ? this.formatDate(grn.postedAt) : '—'}</div>
        </div>
      `;

      let totalSum = 0;
      let rowsHtml = '';

      for (const line of grn.lines) {
        const lineTotal =
          Number(line.quantityReceived) * Number(line.unitPrice);
        totalSum += lineTotal;

        const lotInfo = line.lot
          ? `${line.lot.lotNumber}${line.lot.expiryDate ? ' (' + this.formatDate(line.lot.expiryDate).substring(0, 10) + ')' : ''}`
          : '—';

        rowsHtml += `
          <tr>
            <td>${line.item?.sku || '—'}</td>
            <td>
              <div style="font-weight: 600;">${line.item?.name || '—'}</div>
            </td>
            <td>${lotInfo}</td>
            <td class="align-center">${Number(line.quantityReceived)}</td>
            <td class="align-center">${line.item?.unitOfMeasure?.code || '—'}</td>
            <td class="align-right">${Number(line.unitPrice).toFixed(2)}</td>
            <td class="align-right">${lineTotal.toFixed(2)}</td>
          </tr>
        `;
      }

      const contentHtml = `
        <table>
          <thead>
            <tr>
              <th style="width: 12%;">${isAr ? 'كود الصنف' : 'SKU'}</th>
              <th style="width: 33%;">${isAr ? 'اسم الصنف' : 'Description'}</th>
              <th style="width: 20%;">${isAr ? 'الدفعة والصلاحية' : 'Lot / Exp'}</th>
              <th style="width: 8%;" class="align-center">${isAr ? 'الكمية' : 'Qty'}</th>
              <th style="width: 7%;" class="align-center">${isAr ? 'الوحدة' : 'UoM'}</th>
              <th style="width: 10%;" class="align-right">${isAr ? 'السعر' : 'Price'}</th>
              <th style="width: 10%;" class="align-right">${isAr ? 'الإجمالي' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      const summaryHtml = `
        <div class="summary-box">
          <div class="summary-row total">
            <span>${isAr ? 'إجمالي المستلم' : 'Total Received Value'}:</span>
            <span>${this.formatCurrency(totalSum, currency)}</span>
          </div>
        </div>
      `;

      const logoHtml = await this.getRestaurantLogoHtml();
      const html = this.wrapHtml(
        title,
        locale,
        detailsHtml,
        contentHtml,
        summaryHtml,
        logoHtml,
      );
      return await this.renderHtmlToPdf(html);
    } catch (error) {
      console.error(`Error generating GRN PDF for ID ${id}:`, error);
      throw error;
    }
  }

  async generateAdjustmentPdf(
    id: string,
    locale: 'ar' | 'en' = 'en',
  ): Promise<Buffer> {
    try {
      const adj = await this.prisma.adjustment.findUnique({
        where: { id },
        include: {
          warehouse: true,
          createdBy: {
            select: { name: true, email: true },
          },
          lines: {
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

      if (!adj) {
        throw new NotFoundException(
          `Inventory Adjustment with ID ${id} not found`,
        );
      }

      const isAr = locale === 'ar';
      const currency = await this.getBaseCurrencyCode();
      const title = getDocumentTitle('adjustment', locale);

      const detailsHtml = `
        <div class="details-column">
          <div class="details-column-title">${isAr ? 'معلومات التسوية' : 'Adjustment Info'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'رقم المستند' : 'Doc No'}:</span> ${adj.adjustmentNumber}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'المستودع' : 'Warehouse'}:</span> ${adj.warehouse?.name || '—'}</div>
        </div>
        <div class="details-column">
          <div class="details-column-title">${isAr ? 'التفاصيل' : 'Details'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'أنشئ بواسطة' : 'Created By'}:</span> ${adj.createdBy?.name || 'System'} (${adj.createdBy?.email || '—'})</div>
          <div class="details-row"><span class="details-label">${isAr ? 'الحالة' : 'Status'}:</span> ${adj.status}</div>
        </div>
      `;

      let rowsHtml = '';
      for (const line of adj.lines) {
        const lotNumber = line.lot?.lotNumber || '—';
        const dirText =
          line.direction === 'IN'
            ? isAr
              ? 'زيادة (IN)'
              : 'IN (Increase)'
            : isAr
              ? 'نقص (OUT)'
              : 'OUT (Decrease)';

        const costVal =
          line.unitCost !== null
            ? this.formatCurrency(Number(line.unitCost), currency)
            : '—';

        rowsHtml += `
          <tr>
            <td>${line.item?.sku || '—'}</td>
            <td>
              <div style="font-weight: 600;">${line.item?.name || '—'}</div>
            </td>
            <td>${lotNumber}</td>
            <td class="align-center">${dirText}</td>
            <td class="align-center">${Number(line.quantity)}</td>
            <td class="align-center">${line.item?.unitOfMeasure?.code || '—'}</td>
            <td class="align-right">${costVal}</td>
          </tr>
        `;
      }

      let contentHtml = '';
      if (adj.notes) {
        contentHtml += `
          <div class="notes-box">
            <strong>${isAr ? 'ملاحظات' : 'Notes'}:</strong> ${adj.notes}
          </div>
        `;
      }

      contentHtml += `
        <table>
          <thead>
            <tr>
              <th style="width: 15%;">${isAr ? 'كود الصنف' : 'SKU'}</th>
              <th style="width: 35%;">${isAr ? 'اسم الصنف' : 'Description'}</th>
              <th style="width: 15%;">${isAr ? 'رقم الدفعة' : 'Lot Number'}</th>
              <th style="width: 15%;" class="align-center">${isAr ? 'الاتجاه' : 'Direction'}</th>
              <th style="width: 8%;" class="align-center">${isAr ? 'الكمية' : 'Qty'}</th>
              <th style="width: 7%;" class="align-center">${isAr ? 'الوحدة' : 'UoM'}</th>
              <th style="width: 10%;" class="align-right">${isAr ? 'التكلفة' : 'Cost'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      const logoHtml = await this.getRestaurantLogoHtml();
      const html = this.wrapHtml(
        title,
        locale,
        detailsHtml,
        contentHtml,
        '',
        logoHtml,
      );
      return await this.renderHtmlToPdf(html);
    } catch (error) {
      console.error(`Error generating Adjustment PDF for ID ${id}:`, error);
      throw error;
    }
  }

  async generateStocktakePdf(
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
          `Stocktake Session with ID ${id} not found`,
        );
      }

      const isAr = locale === 'ar';
      const currency = await this.getBaseCurrencyCode();
      const title = getDocumentTitle('stocktake', locale);

      const detailsHtml = `
        <div class="details-column">
          <div class="details-column-title">${isAr ? 'معلومات الجلسة' : 'Session Info'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'رقم الجلسة' : 'Session No'}:</span> ${session.sessionNumber}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'المستودع' : 'Warehouse'}:</span> ${session.warehouse?.name || '—'}</div>
        </div>
        <div class="details-column">
          <div class="details-column-title">${isAr ? 'التفاصيل' : 'Details'}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'تاريخ البدء' : 'Created Date'}:</span> ${this.formatDate(session.createdAt)}</div>
          <div class="details-row"><span class="details-label">${isAr ? 'الحالة' : 'Status'}:</span> ${session.status}</div>
        </div>
      `;

      let totalVarianceValue = 0;
      let rowsHtml = '';

      for (const snap of session.snapshots) {
        const count = session.counts.find(
          (c: { itemId: string; lotId: string | null }) =>
            c.itemId === snap.itemId && c.lotId === snap.lotId,
        );

        const snapQty = Number(snap.qtySnapshot);
        const countQty = count ? Number(count.qtyCounted) : null;
        const variance = countQty !== null ? countQty - snapQty : null;
        const wac = Number(snap.wacSnapshot);
        const valVar = variance !== null ? variance * wac : 0;
        totalVarianceValue += valVar;

        const lotNumber = snap.lot?.lotNumber || '—';

        rowsHtml += `
          <tr>
            <td>${snap.item?.sku || '—'}</td>
            <td>
              <div style="font-weight: 600;">${snap.item?.name || '—'}</div>
            </td>
            <td>${lotNumber}</td>
            <td class="align-center">${snapQty}</td>
            <td class="align-center">${countQty !== null ? countQty : '—'}</td>
            <td class="align-center">${variance !== null ? variance : '—'}</td>
            <td class="align-center">${snap.item?.unitOfMeasure?.code || '—'}</td>
            <td class="align-right">${variance !== null ? valVar.toFixed(2) : '—'}</td>
          </tr>
        `;
      }

      const contentHtml = `
        <table>
          <thead>
            <tr>
              <th style="width: 12%;">${isAr ? 'كود الصنف' : 'SKU'}</th>
              <th style="width: 33%;">${isAr ? 'اسم الصنف' : 'Description'}</th>
              <th style="width: 15%;">${isAr ? 'رقم الدفعة' : 'Lot Number'}</th>
              <th style="width: 8%;" class="align-center">${isAr ? 'الكمية الدفترية' : 'Snap Qty'}</th>
              <th style="width: 8%;" class="align-center">${isAr ? 'الكمية الفعلية' : 'Count Qty'}</th>
              <th style="width: 8%;" class="align-center">${isAr ? 'الفارق' : 'Var'}</th>
              <th style="width: 6%;" class="align-center">${isAr ? 'الوحدة' : 'UoM'}</th>
              <th style="width: 10%;" class="align-right">${isAr ? 'قيمة الفارق' : 'Val Var'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      const summaryHtml = `
        <div class="summary-box">
          <div class="summary-row total">
            <span>${isAr ? 'إجمالي قيمة التباين' : 'Total Variance Value'}:</span>
            <span>${this.formatCurrency(totalVarianceValue, currency)}</span>
          </div>
        </div>
      `;

      const logoHtml = await this.getRestaurantLogoHtml();
      const html = this.wrapHtml(
        title,
        locale,
        detailsHtml,
        contentHtml,
        summaryHtml,
        logoHtml,
      );
      return await this.renderHtmlToPdf(html);
    } catch (error) {
      console.error(`Error generating Stocktake PDF for ID ${id}:`, error);
      throw error;
    }
  }
}
