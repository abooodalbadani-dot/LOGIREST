export const adminMocks: Record<string, unknown> = {
  'GET /admin/users': {
    data: [
      {
        id: 'user-1',
        name: 'أحمد المنصور',
        email: 'ahmed@logirest.com',
        role: 'ADMIN',
        scopes: [
          { branch_id: 'br-1', warehouse_id: null, department_id: null },
        ],
      },
      {
        id: 'user-2',
        name: 'سارة حسن',
        email: 'sara@logirest.com',
        role: 'INV_MGR',
        scopes: [
          { branch_id: 'br-1', warehouse_id: 'wh-1', department_id: null },
          { branch_id: 'br-2', warehouse_id: 'wh-3', department_id: null },
        ],
      },
      {
        id: 'user-3',
        name: 'خالد ناصر',
        email: 'khalid@logirest.com',
        role: 'WH_KEEPER',
        scopes: [
          { branch_id: 'br-1', warehouse_id: 'wh-1', department_id: 'dep-1' },
        ],
      },
    ],
    meta: { page: 1, page_size: 10, total: 3, total_pages: 1 },
  },

  'GET /admin/users/user-1': {
    id: 'user-1',
    name: 'أحمد المنصور',
    email: 'ahmed@logirest.com',
    role: 'ADMIN',
    scopes: [
      { branch_id: 'br-1', warehouse_id: null, department_id: null },
    ],
  },

  'GET /admin/audit-log': {
    data: [
      {
        id: 'log-1',
        entity_type: 'item',
        entity_id: 'item-1',
        action: 'UPDATE',
        user_id: 'user-1',
        user_name: 'أحمد المنصور',
        changes: [
          { field: 'name_ar', old_value: 'لحم بقر', new_value: 'لحم بقر طازج' },
          { field: 'min_stock_level', old_value: 50, new_value: 30 },
        ],
        created_at: '2026-04-20T10:30:00Z',
      },
      {
        id: 'log-2',
        entity_type: 'issue',
        entity_id: 'iss-1',
        action: 'POST',
        user_id: 'user-2',
        user_name: 'سارة حسن',
        changes: [
          { field: 'status', old_value: 'DRAFT', new_value: 'POSTED' },
        ],
        created_at: '2026-04-20T09:15:00Z',
      },
      {
        id: 'log-3',
        entity_type: 'warehouse',
        entity_id: 'wh-2',
        action: 'CREATE',
        user_id: 'user-1',
        user_name: 'أحمد المنصور',
        changes: [
          { field: 'code', old_value: null, new_value: 'WH-002' },
          { field: 'name_ar', old_value: null, new_value: 'مستودع التبريد' },
        ],
        created_at: '2026-04-19T14:00:00Z',
      },
      {
        id: 'log-4',
        entity_type: 'purchase_order',
        entity_id: 'po-1',
        action: 'UPDATE',
        user_id: 'user-3',
        user_name: 'خالد ناصر',
        changes: [
          { field: 'expected_delivery_date', old_value: '2026-05-01', new_value: '2026-05-10' },
        ],
        created_at: '2026-04-19T11:20:00Z',
      },
      {
        id: 'log-5',
        entity_type: 'user',
        entity_id: 'user-3',
        action: 'UPDATE',
        user_id: 'user-1',
        user_name: 'أحمد المنصور',
        changes: [
          { field: 'role', old_value: 'WH_KEEPER', new_value: 'INV_MGR' },
        ],
        created_at: '2026-04-18T16:45:00Z',
      },
    ],
    meta: { page: 1, page_size: 10, total: 5, total_pages: 1 },
  },
};