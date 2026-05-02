export type ImportEntity = 'items' | 'uoms' | 'barcodes';

export const getTemplateHeaders = (entity: ImportEntity): string[] => {
 switch (entity) {
 case 'items':
 return ['Name', 'Code', 'Category', 'Unit', 'LotTracked', 'Status'];
 case 'uoms':
 return ['Name', 'Code', 'Active'];
 case 'barcodes':
 return ['ItemCode', 'UoMCode', 'Barcode', 'DefaultQty', 'Active'];
 default:
 return [];
 }
};
