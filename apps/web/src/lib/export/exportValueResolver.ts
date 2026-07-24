/**
 * Intelligently resolves export cell values for a given row and column key,
 * handling direct keys, nested dot notation, and common domain aliases.
 */
export function getExportRowValue(row: Record<string, unknown>, colKey: string): unknown {
  if (!row || typeof row !== 'object') return '';

  // 1. Direct property match
  if (row[colKey] !== undefined && row[colKey] !== null && row[colKey] !== '') {
    return row[colKey];
  }

  // 2. Nested property match (e.g., "warehouse.name" or "supplier.name")
  if (colKey.includes('.')) {
    const parts = colKey.split('.');
    let curr: unknown = row;
    for (const part of parts) {
      if (curr && typeof curr === 'object' && part in (curr as Record<string, unknown>)) {
        curr = (curr as Record<string, unknown>)[part];
      } else {
        curr = undefined;
        break;
      }
    }
    if (curr !== undefined && curr !== null && curr !== '') {
      return curr;
    }
  }

  // 3. Known Aliases Map based on common domain properties
  const keyLower = colKey.toLowerCase();

  // Document Number / Voucher / Session / Order / Request Number / SKU / Code aliases
  if (
    keyLower.includes('doc_number') ||
    keyLower.includes('docnumber') ||
    keyLower.includes('documentnumber') ||
    keyLower.includes('transfernumber') ||
    keyLower.includes('ordernumber') ||
    keyLower.includes('requestnumber') ||
    keyLower.includes('sessionnumber') ||
    keyLower.includes('voucher') ||
    keyLower === 'code' ||
    keyLower === 'sku' ||
    keyLower === 'id'
  ) {
    const val =
      row.documentNumber ??
      row.transferNumber ??
      row.orderNumber ??
      row.requestNumber ??
      row.sessionNumber ??
      row.poNumber ??
      row.grnNumber ??
      row.issueNumber ??
      row.code ??
      row.sku ??
      row.id;
    if (val !== undefined && val !== null && val !== '') return val;
  }

  // Status aliases
  if (keyLower.includes('status')) {
    const val =
      row.status ??
      row.transferStatus ??
      row.poStatus ??
      row.prStatus ??
      row.grnStatus ??
      row.issueStatus ??
      row.state;
    if (val !== undefined && val !== null && val !== '') return val;
  }

  // From / Source Warehouse aliases
  if (
    keyLower.includes('from') ||
    keyLower.includes('source')
  ) {
    const val =
      row.fromWarehouseName ??
      row.sourceWarehouseName ??
      row.fromWarehouse ??
      row.sourceWarehouse;
    if (val !== undefined && val !== null && val !== '') return val;
  }

  // To / Target Warehouse or Destination Department aliases
  if (
    keyLower.includes('to') ||
    keyLower.includes('target') ||
    keyLower.includes('dest')
  ) {
    const val =
      row.toWarehouseName ??
      row.targetWarehouseName ??
      row.destinationDepartmentName ??
      row.departmentName ??
      row.toWarehouse ??
      row.targetWarehouse;
    if (val !== undefined && val !== null && val !== '') return val;
  }

  // Warehouse Name aliases
  if (keyLower.includes('warehouse')) {
    const val =
      row.warehouseName ??
      row.fromWarehouseName ??
      row.toWarehouseName ??
      (row.warehouse && typeof row.warehouse === 'object' ? (row.warehouse as { name?: string }).name : undefined);
    if (val !== undefined && val !== null && val !== '') return val;
  }

  // Supplier Name aliases
  if (keyLower.includes('supplier')) {
    const val =
      row.supplierName ??
      (row.supplier && typeof row.supplier === 'object' ? (row.supplier as { name?: string }).name : undefined);
    if (val !== undefined && val !== null && val !== '') return val;
  }

  // Department Name aliases
  if (keyLower.includes('department') || keyLower.includes('dept')) {
    const val =
      row.departmentName ??
      row.destinationDepartmentName ??
      (row.department && typeof row.department === 'object' ? (row.department as { name?: string }).name : undefined);
    if (val !== undefined && val !== null && val !== '') return val;
  }

  // Total Amount aliases
  if (keyLower.includes('total') || keyLower.includes('amount')) {
    const val =
      row.totalAmount ??
      row.supplierTotalAmount ??
      row.amount ??
      row.total;
    if (val !== undefined && val !== null && val !== '') return val;
  }

  // Counted Items / Items count aliases
  if (keyLower.includes('counted') || keyLower.includes('item_count') || keyLower.includes('items')) {
    const val =
      row.countedItems ??
      row.totalItems ??
      row.itemsCount;
    if (val !== undefined && val !== null && val !== '') return val;
  }

  // Created At / Date aliases
  if (keyLower.includes('date') || keyLower.includes('created') || keyLower.includes('snapshot')) {
    const val =
      row.createdAt ??
      row.date ??
      row.snapshotAt ??
      row.postedAt ??
      row.receivedAt;
    if (val !== undefined && val !== null && val !== '') return val;
  }

  return row[colKey] ?? '';
}
