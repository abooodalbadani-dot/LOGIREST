export type ImportEntity = 'items' | 'uoms' | 'barcodes' | 'suppliers' | 'openingStock';

export const getTemplateHeaders = (entity: ImportEntity): string[] => {
  switch (entity) {
    case 'items':
      return ['Name', 'Code', 'Category', 'Unit', 'LotTracked', 'Status'];
    case 'uoms':
      return ['Name', 'Code', 'Active'];
    case 'barcodes':
      return ['ItemCode', 'UoMCode', 'Barcode', 'DefaultQty', 'Active'];
    case 'suppliers':
      return ['code', 'name', 'contactName', 'contactEmail', 'contactPhone'];
    case 'openingStock':
      return ['warehouseCode', 'itemSku', 'quantity', 'unitCost', 'lotNumber', 'expiryDate'];
    default:
      return [];
  }
};
