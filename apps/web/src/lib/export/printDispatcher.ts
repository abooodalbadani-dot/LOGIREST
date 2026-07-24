import { generatePDF } from './pdfExport';
import { type SystemPrintSettings } from '@/features/admin/hooks/useSystemPrintSettings';
import { type KitchenRequestDetail, type KitchenRequestItem } from '@/features/operations/types/kitchen-request';
import { type StockIssue, type IssueLineItem, type LotAllocation } from '@/types/documents';

export interface PrintDispatcherOptions {
  docType?: 'KITCHEN_REQUEST' | 'INVENTORY_ISSUE';
  doc?: KitchenRequestDetail | StockIssue;
  columns?: { header: string; key: string }[];
  data?: Record<string, unknown>[];
  filename?: string;
  title?: string;
  scope?: string;
  generatedBy?: string;
  settings: SystemPrintSettings | undefined;
  locale: 'ar' | 'en';
  onThermalPrint?: (paperSize: '80mm' | '58mm', showLogo: boolean) => void;
}

function isKitchenRequest(
  docType: 'KITCHEN_REQUEST' | 'INVENTORY_ISSUE',
  _doc: KitchenRequestDetail | StockIssue
): _doc is KitchenRequestDetail {
  return docType === 'KITCHEN_REQUEST' && !!_doc;
}

function isStockIssue(
  docType: 'KITCHEN_REQUEST' | 'INVENTORY_ISSUE',
  _doc: KitchenRequestDetail | StockIssue
): _doc is StockIssue {
  return docType === 'INVENTORY_ISSUE' && !!_doc;
}

export async function dispatchPrintJob({
  docType,
  doc,
  columns,
  data,
  filename,
  title,
  scope,
  generatedBy,
  settings,
  locale,
  onThermalPrint,
}: PrintDispatcherOptions) {
  const isReceiptOrOperational = docType === 'KITCHEN_REQUEST' || docType === 'INVENTORY_ISSUE';
  const paperSize = settings?.defaultPaperSize || 'A4';
  const showLogo = settings?.thermalShowLogo ?? true;

  const isAr = locale === 'ar';

  if (
    docType &&
    doc &&
    (paperSize === '80mm' || paperSize === '58mm') &&
    onThermalPrint
  ) {
    onThermalPrint(paperSize, showLogo);
    return;
  }

  if (docType === 'KITCHEN_REQUEST' && doc && isKitchenRequest(docType, doc)) {
    const pdfCols = [
      { header: isAr ? 'كود الصنف' : 'Item Code', key: 'code' },
      { header: isAr ? 'اسم الصنف' : 'Item Name', key: 'name' },
      { header: isAr ? 'الكمية المطلوبة' : 'Qty Req', key: 'qty' },
      { header: isAr ? 'المنفذ' : 'Fulfilled', key: 'fulfilledQty' },
      { header: isAr ? 'الوحدة' : 'UOM', key: 'uom' },
      { header: isAr ? 'الملاحظات' : 'Notes', key: 'notes' },
    ];

    const pdfRows = (doc.items || []).map((item: KitchenRequestItem) => ({
      code: item.itemId,
      name: item.itemName,
      qty: item.quantity,
      fulfilledQty: item.fulfilledQuantity ?? 0,
      uom: item.uom,
      notes: item.notes ?? '',
    }));

    const pdfTitle = isAr
      ? `طلب تحضير مطبخ - ${doc.requestNumber}`
      : `KITCHEN REQUEST - ${doc.requestNumber}`;

    await generatePDF(pdfCols, pdfRows, `KitchenRequest_${doc.requestNumber}`, pdfTitle, {
      scope: doc.departmentName,
      generatedBy: doc.requestedBy,
    });
  } else if (docType === 'INVENTORY_ISSUE' && doc && isStockIssue(docType, doc)) {
    const pdfCols = [
      { header: isAr ? 'كود الصنف' : 'Item Code', key: 'code' },
      { header: isAr ? 'اسم الصنف' : 'Item Name', key: 'name' },
      { header: isAr ? 'الكمية المنصرفة' : 'Qty Issued', key: 'qty' },
      { header: isAr ? 'الدفعة / الصلاحية' : 'Lot / Expiry', key: 'lot' },
      { header: isAr ? 'الوحدة' : 'UOM', key: 'uom' },
    ];

    const pdfRows = (doc.lines || []).map((line: IssueLineItem) => {
      const lotText = line.lotAllocations && line.lotAllocations.length > 0
        ? line.lotAllocations.map((alloc: LotAllocation) => `${alloc.lotNumber} (${alloc.allocatedQty})`).join(', ')
        : line.lot ? `${line.lot.lotNumber}` : '—';

      return {
        code: line.item.code,
        name: line.item.name || '—',
        qty: line.qty,
        lot: lotText,
        uom: line.item.primaryUom?.code || line.uomId || '',
      };
    });

    const pdfTitle = isAr
      ? `سند صرف مخزني - ${doc.documentNumber}`
      : `INVENTORY ISSUE - ${doc.documentNumber}`;

    await generatePDF(pdfCols, pdfRows, `InventoryIssue_${doc.documentNumber}`, pdfTitle, {
      scope: doc.destinationDepartmentName || doc.departmentName || doc.warehouseName || doc.destinationDeptId || doc.warehouseId,
      generatedBy: doc.createdBy || doc.requestedBy || '',
    });
  } else if (columns && data && filename && title) {
    const pdfCols = columns.map((c) => ({ header: c.header, key: c.key }));
    await generatePDF(pdfCols, data, filename, title, {
      scope,
      generatedBy,
    });
  }
}
