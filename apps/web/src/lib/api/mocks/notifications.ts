export const notificationsMocks: Record<string, unknown> = {
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
          { name: 'item_name', label_ar: 'اسم الصنف', label_en: 'Item Name', sample_value: 'Tomato Paste' },
          { name: 'qty', label_ar: 'الكمية الحالية', label_en: 'Current Quantity', sample_value: '5' },
          { name: 'min_qty', label_ar: 'الحد الأدنى', label_en: 'Minimum Threshold', sample_value: '10' }
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
          { name: 'item_name', label_ar: 'اسم الصنف', label_en: 'Item Name', sample_value: 'Frozen Beef Breasts' },
          { name: 'days', label_ar: 'الأيام المتبقية', label_en: 'Days Remaining', sample_value: '3' },
          { name: 'lot_number', label_ar: 'رقم الدفعة', label_en: 'Lot Number', sample_value: 'LOT-2026-05A' }
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
          { name: 'user_name', label_ar: 'اسم المستخدم', label_en: 'User Name', sample_value: 'Khalid Nasser' },
          { name: 'new_role', label_ar: 'الدور الجديد', label_en: 'New Role', sample_value: 'Kitchen Manager' }
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
          { name: 'date', label_ar: 'التاريخ', label_en: 'Date', sample_value: '2026-05-20' },
          { name: 'branch_name', label_ar: 'اسم الفرع', label_en: 'Branch Name', sample_value: 'Riyadh Main Kitchen' }
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
