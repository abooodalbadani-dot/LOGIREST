export type ImportEntity = 'items' | 'uoms' | 'barcodes' | 'suppliers' | 'openingStock' | 'categories';

export const getTemplateHeaders = (entity: ImportEntity): string[] => {
  switch (entity) {
    case 'categories':
      return ['Name', 'Code'];
    case 'items':
      return ['Name', 'Code', 'Category', 'Unit', 'LotTracked', 'Status'];
    case 'uoms':
      return ['Name', 'Code'];
    case 'barcodes':
      return ['ItemCode', 'Barcode'];
    case 'suppliers':
      return ['code', 'name', 'contactName', 'contactEmail', 'contactPhone'];
    case 'openingStock':
      return ['warehouseCode', 'itemSku', 'quantity', 'unitCost', 'lotNumber', 'expiryDate'];
    default:
      return [];
  }
};
