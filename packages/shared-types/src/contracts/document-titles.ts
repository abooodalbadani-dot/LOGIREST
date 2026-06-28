/**
 * Document Title Localization Map
 * Resolves clean, single-language titles to prevent Bidi rendering artifacts.
 */

export interface DocumentTitle {
  en: string;
  ar: string;
}

export const DOCUMENT_TITLE_MAP: Record<string, DocumentTitle> = {
  stocktake: {
    en: 'STOCKTAKE MANIFEST',
    ar: 'بيان جرد - STOCKTAKE MANIFEST',
  },
  po: {
    en: 'PURCHASE ORDER',
    ar: 'أمر شراء - PURCHASE ORDER',
  },
  pr: {
    en: 'PURCHASE REQUISITION',
    ar: 'طلب شراء - PURCHASE REQUISITION',
  },
  grn: {
    en: 'GOODS RECEIPT',
    ar: 'سند استلام بضاعة - GOODS RECEIPT',
  },
  transfer: {
    en: 'STOCK TRANSFER',
    ar: 'سند تحويل مخزني - STOCK TRANSFER',
  },
  adjustment: {
    en: 'INVENTORY ADJUSTMENT',
    ar: 'تسوية مخزنية - INVENTORY ADJUSTMENT',
  },
  kitchen_request: {
    en: 'KITCHEN REQUEST',
    ar: 'طلب تحضير مطبخ - KITCHEN REQUEST',
  },
  inventory_issue: {
    en: 'INVENTORY ISSUE',
    ar: 'سند صرف مخزني - INVENTORY ISSUE',
  },
  // Report identifiers from frontend
  master_data_items: {
    en: 'Master Data Items Report',
    ar: 'تقرير الأصناف الرئيسية',
  },
  inventory_balance: {
    en: 'Inventory Balance Report',
    ar: 'تقرير رصيد المخزون',
  },
  stock_movements: {
    en: 'Stock Movements Report',
    ar: 'تقرير حركات المخزون',
  },
  procurement_status: {
    en: 'Procurement Status Report',
    ar: 'تقرير حالة المشتريات',
  },
  stocktake_variance: {
    en: 'Stocktake Variance Report',
    ar: 'تقرير فروقات الجرد',
  },
  expiry_report: {
    en: 'Expiry Report',
    ar: 'تقرير صلاحية المواد',
  },
  items: {
    en: 'Items',
    ar: 'الأصناف',
  },
  operations_stocktake: {
    en: 'STOCKTAKE MANIFEST',
    ar: 'بيان جرد - STOCKTAKE MANIFEST',
  },
  operations_adjustments: {
    en: 'INVENTORY ADJUSTMENT',
    ar: 'تعديلات المخزون',
  },
  operational_requisitions: {
    en: 'OPERATIONAL REQUISITIONS',
    ar: 'طلبات التشغيل',
  }
};

/**
 * Resolves a document title cleanly for a given locale, enforcing no cross-locale bleed.
 */
export function getDocumentTitle(key: string, locale: 'ar' | 'en'): string {
  if (!key) return '';
  const normalizedKey = key.trim().toLowerCase();
  const match = DOCUMENT_TITLE_MAP[normalizedKey] || DOCUMENT_TITLE_MAP[key];
  if (match) {
    return locale === 'ar' ? match.ar : match.en;
  }

  // Fallback replacing underscores with spaces
  return key.replace(/_/g, ' ');
}
