export const inventoryMocks: Record<string, unknown> = {
  'GET /inventory/balance': {
    data: [
      { item_id: '1', warehouse_id: 'wh1', total_qty: 100, available_qty: 80 }
    ],
    meta: {
      pagination: { page: 1, pageSize: 10, total: 1, total_pages: 1 }
    }
  }
};
