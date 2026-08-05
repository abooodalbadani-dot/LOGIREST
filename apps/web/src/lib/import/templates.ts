export type ImportEntity = 'items' | 'uoms' | 'barcodes' | 'suppliers' | 'openingStock' | 'categories';

export const getTemplateHeaders = (entity: ImportEntity): string[] => {
  switch (entity) {
    case 'categories':
      return ['Name', 'Code', 'Description'];
    case 'items':
      return ['Name', 'Code', 'Category', 'Unit', 'SecondaryUnit', 'ConversionFactor', 'LotTracked', 'Status'];
    case 'uoms':
      return ['Name', 'Code'];
    case 'barcodes':
      return ['ItemCode', 'Barcode', 'Unit'];
    case 'suppliers':
      return ['code', 'name', 'contactName', 'contactEmail', 'contactPhone'];
    case 'openingStock':
      return ['warehouseCode', 'itemSku', 'unit', 'quantity', 'unitCost', 'lotNumber', 'expiryDate'];
    default:
      return [];
  }
};
