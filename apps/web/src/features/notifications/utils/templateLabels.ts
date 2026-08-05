export const TEMPLATE_LABEL_MAP: Record<string, { ar: string; en: string }> = {
  LOW_STOCK_ALERT: { ar: 'تنبيه نقص المخزون', en: 'Low Stock Alert' },
  EXPIRY_WARNING_ALERT: { ar: 'تحذير قرب انتهاء الصلاحية', en: 'Expiry Warning Alert' },
  ADJUSTMENT_POSTED: { ar: 'ترحيل تسوية مخزنية', en: 'Stock Adjustment Posted' },
  STOCKTAKE_POSTED: { ar: 'اعتماد نتائج الجرد المخزني', en: 'Stocktake Finalized' },
  TRANSFER_SHIPPED: { ar: 'شحن تحويل مخزني', en: 'Warehouse Transfer Dispatched' },
  TRANSFER_RECEIVED: { ar: 'استلام تحويل مخزني', en: 'Warehouse Transfer Received' },
  PR_APPROVED: { ar: 'الموافقة على طلب الشراء', en: 'Purchase Request Approved' },
  PR_REJECTED: { ar: 'رفض طلب الشراء', en: 'Purchase Request Rejected' },
  PO_PENDING_APPROVAL: { ar: 'أمر شراء بانتظار الاعتماد', en: 'PO Pending Approval' },
  PO_APPROVED: { ar: 'الموافقة على أمر الشراء', en: 'Purchase Order Approved' },
  KITCHEN_REQUEST_SUBMITTED: { ar: 'رفع طلب مطبخ جديد', en: 'Kitchen Request Submitted' },
  KITCHEN_REQUEST_POSTED: { ar: 'صرف طلب مطبخ', en: 'Kitchen Request Issued' },
  GRN_POSTED: { ar: 'اعتماد سند استلام بضاعة', en: 'Goods Received Note Posted' },
};

export function getTemplateLabel(code: string, locale: string = 'ar'): string {
  if (!code) return '';
  const map = TEMPLATE_LABEL_MAP[code.toUpperCase()];
  if (map) {
    return locale === 'ar' ? map.ar : map.en;
  }
  return code.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
