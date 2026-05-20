const TRIGGER_EVENTS = [
  { code: 'LOW_STOCK', name_ar: 'تنبيه نقص المخزون', name_en: 'Low Stock Alert', entity_type: 'Item', description: 'Triggered when item quantity falls below minimum threshold', suggested_fields: ['item_name', 'qty', 'min_qty'] },
  { code: 'EXPIRY_WARNING', name_ar: 'تحذير انتهاء الصلاحية', name_en: 'Expiry Warning', entity_type: 'Lot', description: 'Triggered when a lot approaches its expiration date', suggested_fields: ['item_name', 'days', 'lot_number'] },
  { code: 'ROLE_UPDATE', name_ar: 'تحديث صلاحيات المستخدم', name_en: 'User Role Update', entity_type: 'User', description: 'Triggered when a user role or permission is modified', suggested_fields: ['user_name', 'new_role'] },
  { code: 'SCHEDULED_REPORT', name_ar: 'تقرير مجدول', name_en: 'Scheduled Report', entity_type: 'Report', description: 'Triggered on a scheduled basis for recurring reports', suggested_fields: ['date', 'branch_name'] },
  { code: 'ORDER_CREATED', name_ar: 'إنشاء طلب', name_en: 'Order Created', entity_type: 'Order', description: 'Triggered when a new purchase order is created', suggested_fields: ['order_id', 'supplier_name', 'total_amount', 'user_name'] },
  { code: 'TRANSFER_RECEIVED', name_ar: 'استلام تحويل', name_en: 'Transfer Received', entity_type: 'Transfer', description: 'Triggered when an inter-warehouse transfer is received', suggested_fields: ['transfer_id', 'from_warehouse', 'to_warehouse', 'item_count', 'user_name'] },
  { code: 'ADJUSTMENT_POSTED', name_ar: 'ترحيل تسوية', name_en: 'Adjustment Posted', entity_type: 'Adjustment', description: 'Triggered when a stock adjustment is posted', suggested_fields: ['adjustment_id', 'item_name', 'direction', 'qty', 'user_name'] },
];

const PARAMETER_REGISTRY: Record<string, Array<{ entity: string; field: string; type: 'string' | 'number' | 'date' | 'boolean'; label_ar: string; label_en: string; sample_value: string }>> = {
  Item: [
    { entity: 'Item', field: 'name', type: 'string', label_ar: 'اسم الصنف', label_en: 'Item Name', sample_value: 'Tomato Paste' },
    { entity: 'Item', field: 'sku', type: 'string', label_ar: 'رمز الصنف', label_en: 'Item SKU', sample_value: 'SKU-00142' },
    { entity: 'Item', field: 'min_qty', type: 'number', label_ar: 'الحد الأدنى', label_en: 'Min Quantity', sample_value: '10' },
    { entity: 'Item', field: 'current_qty', type: 'number', label_ar: 'الكمية الحالية', label_en: 'Current Quantity', sample_value: '5' },
    { entity: 'Item', field: 'category', type: 'string', label_ar: 'التصنيف', label_en: 'Category', sample_value: 'Canned Goods' },
  ],
  Lot: [
    { entity: 'Lot', field: 'number', type: 'string', label_ar: 'رقم الدفعة', label_en: 'Lot Number', sample_value: 'LOT-2026-05A' },
    { entity: 'Lot', field: 'item_name', type: 'string', label_ar: 'اسم الصنف', label_en: 'Item Name', sample_value: 'Frozen Beef Breasts' },
    { entity: 'Lot', field: 'expiry_date', type: 'date', label_ar: 'تاريخ الانتهاء', label_en: 'Expiry Date', sample_value: '2026-06-15' },
    { entity: 'Lot', field: 'days_remaining', type: 'number', label_ar: 'الأيام المتبقية', label_en: 'Days Remaining', sample_value: '3' },
    { entity: 'Lot', field: 'qty', type: 'number', label_ar: 'الكمية', label_en: 'Quantity', sample_value: '120' },
  ],
  User: [
    { entity: 'User', field: 'name', type: 'string', label_ar: 'اسم المستخدم', label_en: 'User Name', sample_value: 'Khalid Nasser' },
    { entity: 'User', field: 'email', type: 'string', label_ar: 'البريد الإلكتروني', label_en: 'Email', sample_value: 'khalid@kitchenstore.com' },
    { entity: 'User', field: 'role', type: 'string', label_ar: 'الدور', label_en: 'Role', sample_value: 'Kitchen Manager' },
  ],
  Order: [
    { entity: 'Order', field: 'id', type: 'string', label_ar: 'رقم الطلب', label_en: 'Order ID', sample_value: 'PO-2026-0042' },
    { entity: 'Order', field: 'supplier_name', type: 'string', label_ar: 'اسم المورد', label_en: 'Supplier Name', sample_value: 'Al Baraka Foodstuff' },
    { entity: 'Order', field: 'total_amount', type: 'number', label_ar: 'المبلغ الإجمالي', label_en: 'Total Amount', sample_value: '12500.00' },
    { entity: 'Order', field: 'status', type: 'string', label_ar: 'الحالة', label_en: 'Status', sample_value: 'PENDING' },
    { entity: 'Order', field: 'created_at', type: 'date', label_ar: 'تاريخ الإنشاء', label_en: 'Created At', sample_value: '2026-05-18' },
  ],
  Transfer: [
    { entity: 'Transfer', field: 'id', type: 'string', label_ar: 'رقم التحويل', label_en: 'Transfer ID', sample_value: 'TRF-0038' },
    { entity: 'Transfer', field: 'from_warehouse', type: 'string', label_ar: 'من مخزن', label_en: 'From Warehouse', sample_value: 'Riyadh Main Store' },
    { entity: 'Transfer', field: 'to_warehouse', type: 'string', label_ar: 'إلى مخزن', label_en: 'To Warehouse', sample_value: 'Riyadh Kitchen 2' },
    { entity: 'Transfer', field: 'item_count', type: 'number', label_ar: 'عدد الأصناف', label_en: 'Item Count', sample_value: '15' },
    { entity: 'Transfer', field: 'status', type: 'string', label_ar: 'حالة التحويل', label_en: 'Transfer Status', sample_value: 'IN_TRANSIT' },
  ],
  Adjustment: [
    { entity: 'Adjustment', field: 'id', type: 'string', label_ar: 'رقم التسوية', label_en: 'Adjustment ID', sample_value: 'ADJ-0021' },
    { entity: 'Adjustment', field: 'item_name', type: 'string', label_ar: 'اسم الصنف', label_en: 'Item Name', sample_value: 'Cooking Oil 5L' },
    { entity: 'Adjustment', field: 'direction', type: 'string', label_ar: 'الاتجاه', label_en: 'Direction', sample_value: 'INCREASE' },
    { entity: 'Adjustment', field: 'qty', type: 'number', label_ar: 'الكمية', label_en: 'Quantity', sample_value: '50' },
    { entity: 'Adjustment', field: 'reason', type: 'string', label_ar: 'السبب', label_en: 'Reason', sample_value: 'Damaged during delivery' },
  ],
  Branch: [
    { entity: 'Branch', field: 'name', type: 'string', label_ar: 'اسم الفرع', label_en: 'Branch Name', sample_value: 'Riyadh Main Kitchen' },
    { entity: 'Branch', field: 'code', type: 'string', label_ar: 'رمز الفرع', label_en: 'Branch Code', sample_value: 'BR-01' },
  ],
  Report: [
    { entity: 'Report', field: 'date', type: 'date', label_ar: 'التاريخ', label_en: 'Date', sample_value: '2026-05-20' },
    { entity: 'Report', field: 'type', type: 'string', label_ar: 'نوع التقرير', label_en: 'Report Type', sample_value: 'Daily Consumption' },
    { entity: 'Report', field: 'branch_name', type: 'string', label_ar: 'اسم الفرع', label_en: 'Branch Name', sample_value: 'Riyadh Main Kitchen' },
  ],
};

export const notificationsMocks: Record<string, unknown> = {
  'GET /notifications/trigger-events': { data: TRIGGER_EVENTS },

  'GET /notifications/parameter-registry': PARAMETER_REGISTRY,

  'GET /notifications/templates': {
    data: [
      {
        id: 'tmpl-1',
        code: 'LOW_STOCK_ALERT',
        subject_ar: 'تنبيه نقص المخزون: {{item_name}}',
        subject_en: 'Low Stock Alert: {{item_name}}',
        body_ar: 'الصنف {{item_name}} وصل إلى مستوى مخزون منخفض. الكمية الحالية: {{qty}}.',
        body_en: 'Item {{item_name}} has reached a low stock level. Current quantity: {{qty}}.',
        trigger_event: 'LOW_STOCK',
        is_active: true,
        allowed_parameters: [
          { name: 'item_name', label_ar: 'اسم الصنف', label_en: 'Item Name', sample_value: 'Tomato Paste', entity: 'Item', field_path: 'name' },
          { name: 'qty', label_ar: 'الكمية الحالية', label_en: 'Current Quantity', sample_value: '5', entity: 'Item', field_path: 'current_qty' },
          { name: 'min_qty', label_ar: 'الحد الأدنى', label_en: 'Minimum Threshold', sample_value: '10', entity: 'Item', field_path: 'min_qty' },
        ]
      },
      {
        id: 'tmpl-2',
        code: 'EXPIRY_WARNING',
        subject_ar: 'تحذير انتهاء الصلاحية: {{item_name}}',
        subject_en: 'Expiry Warning: {{item_name}}',
        body_ar: 'الصنف {{item_name}} سينتهي خلال {{days}} أيام. رقم الدفعة: {{lot_number}}.',
        body_en: 'Item {{item_name}} will expire in {{days}} days. Lot number: {{lot_number}}.',
        trigger_event: 'EXPIRY_WARNING',
        is_active: true,
        allowed_parameters: [
          { name: 'item_name', label_ar: 'اسم الصنف', label_en: 'Item Name', sample_value: 'Frozen Beef Breasts', entity: 'Item', field_path: 'name' },
          { name: 'days', label_ar: 'الأيام المتبقية', label_en: 'Days Remaining', sample_value: '3', entity: 'Lot', field_path: 'days_remaining' },
          { name: 'lot_number', label_ar: 'رقم الدفعة', label_en: 'Lot Number', sample_value: 'LOT-2026-05A', entity: 'Lot', field_path: 'number' },
        ]
      },
      {
        id: 'tmpl-3',
        code: 'USER_ROLE_CHANGED',
        subject_ar: 'تحديث صلاحيات المستخدم: {{user_name}}',
        subject_en: 'User Role Updated: {{user_name}}',
        body_ar: 'تم تغيير دورك إلى: {{new_role}}.',
        body_en: 'Your user role has been changed to: {{new_role}}.',
        trigger_event: 'ROLE_UPDATE',
        is_active: true,
        allowed_parameters: [
          { name: 'user_name', label_ar: 'اسم المستخدم', label_en: 'User Name', sample_value: 'Khalid Nasser', entity: 'User', field_path: 'name' },
          { name: 'new_role', label_ar: 'الدور الجديد', label_en: 'New Role', sample_value: 'Kitchen Manager', entity: 'User', field_path: 'role' },
        ]
      },
      {
        id: 'tmpl-4',
        code: 'DAILY_CONSUMPTION_REPORT',
        subject_ar: 'تقرير الاستهلاك اليومي - {{date}}',
        subject_en: 'Daily Consumption Report - {{date}}',
        body_ar: 'مرفق لكم تقرير الاستهلاك اليومي لفرع {{branch_name}}.',
        body_en: 'Please find attached the daily consumption report for {{branch_name}}.',
        trigger_event: 'SCHEDULED_REPORT',
        is_active: true,
        allowed_parameters: [
          { name: 'date', label_ar: 'التاريخ', label_en: 'Date', sample_value: '2026-05-20', entity: 'Report', field_path: 'date' },
          { name: 'branch_name', label_ar: 'اسم الفرع', label_en: 'Branch Name', sample_value: 'Riyadh Main Kitchen', entity: 'Branch', field_path: 'name' },
        ]
      },
    ],
    meta: { page: 1, page_size: 10, total: 4, total_pages: 1 },
  },

  'GET /notifications/templates/:id': (_body: unknown, path: string) => {
    const id = path.split('/').pop();
    const mockData = notificationsMocks['GET /notifications/templates'] as { data: Array<{ id: string }> };
    const template = mockData?.data?.find(t => t.id === id);
    return template;
  },

  'POST /notifications/templates': (body: unknown) => {
    const mockData = notificationsMocks['GET /notifications/templates'] as { data: Array<Record<string, unknown>>; meta: { total: number } };
    const templates = mockData?.data || [];
    const newTemplate = (body || {}) as Record<string, unknown>;
    newTemplate.id = `tmpl-${Date.now()}`;
    newTemplate.is_active = newTemplate.is_active ?? true;
    newTemplate.allowed_parameters = newTemplate.allowed_parameters || [];
    templates.push(newTemplate);
    mockData.meta.total = templates.length;
    return newTemplate;
  },

  'PUT /notifications/templates/:id': (body: unknown, path: string) => {
    const id = path.split('/').pop();
    const mockData = notificationsMocks['GET /notifications/templates'] as { data: Array<Record<string, unknown>> };
    const templates = mockData?.data || [];
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) {
      return {
        error: {
          status: 404,
          message: 'Template not found'
        }
      };
    }
    const updateBody = (body || {}) as Record<string, unknown>;
    templates[index] = {
      ...templates[index],
      ...updateBody,
    };
    return templates[index];
  },

  'POST /notifications/templates/:id/resolve': (_body: unknown, path: string) => {
    const id = path.split('/').pop();
    const mockData = notificationsMocks['GET /notifications/templates'] as { data: Array<Record<string, unknown>> };
    const template = mockData?.data?.find(t => t.id === id);
    if (!template) {
      return { error: { status: 404, message: 'Template not found' } };
    }
    const params = (template.allowed_parameters || []) as Array<Record<string, string>>;
    let subject = (template.subject_en || '') as string;
    let body = (template.body_en || '') as string;
    params.forEach((p: Record<string, string>) => {
      const regex = new RegExp(`\\{\\{\\s*${p.name}\\s*\\}\\}`, 'g');
      const val = p.sample_value || `[${p.name}]`;
      subject = subject.replace(regex, val);
      body = body.replace(regex, val);
    });
    return { subject, body };
  },

  'DELETE /notifications/templates/:id': (_body: unknown, path: string) => {
    const id = path.split('/').pop();
    const mockData = notificationsMocks['GET /notifications/templates'] as { data: Array<Record<string, unknown>>; meta: { total: number } };
    const templates = mockData?.data || [];
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) {
      return {
        error: {
          status: 404,
          message: 'Template not found'
        }
      };
    }
    const deleted = templates.splice(index, 1)[0];
    mockData.meta.total = templates.length;
    return { success: true, deleted };
  },

  'GET /notifications/outbox': {
    data: [
      {
        id: 'out-1',
        template_id: 'tmpl-1',
        recipient_email: 'kitchen@example.com',
        subject: 'Low Stock Alert: Beef',
        sent_at: '2026-04-20T08:30:00Z',
        status: 'SENT',
        error_message: null,
      },
      {
        id: 'out-2',
        template_id: 'tmpl-2',
        recipient_email: 'warehouse@example.com',
        subject: 'Expiry Warning: Chicken',
        sent_at: null,
        status: 'PENDING',
        error_message: null,
      },
      {
        id: 'out-3',
        template_id: 'tmpl-1',
        recipient_email: 'procurement@example.com',
        subject: 'Low Stock Alert: Oil',
        sent_at: '2026-04-19T14:00:00Z',
        status: 'FAILED',
        error_message: 'SMTP connection timeout',
      },
      {
        id: 'out-4',
        template_id: 'tmpl-3',
        recipient_email: 'khalid@logirest.com',
        subject: 'User Role Updated: khalid nasser',
        sent_at: '2026-04-18T16:50:00Z',
        status: 'SENT',
        error_message: null,
      },
      {
        id: 'out-5',
        template_id: 'tmpl-4',
        recipient_email: 'mgr@logirest.com',
        subject: 'Daily Consumption Report - 2026-04-21',
        sent_at: null,
        status: 'FAILED',
        error_message: 'Recipient address rejected',
      },
    ],
    meta: { page: 1, page_size: 10, total: 5, total_pages: 1 },
  },
};
