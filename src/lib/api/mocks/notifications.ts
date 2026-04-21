export const notificationsMocks: Record<string, unknown> = {
  'GET /notifications/templates': {
    data: [
      {
        id: 'tmpl-1',
        code: 'LOW_STOCK_ALERT',
        subject_ar: 'تنبيه نقص المخزون: {item_name}',
        subject_en: 'Low Stock Alert: {item_name}',
        body_ar: 'الصنف {item_name} وصل إلى مستوى مخزون منخفض. الكمية الحالية: {qty}.',
        body_en: 'Item {item_name} has reached a low stock level. Current quantity: {qty}.',
        trigger_event: 'LOW_STOCK',
        is_active: true,
      },
      {
        id: 'tmpl-2',
        code: 'EXPIRY_WARNING',
        subject_ar: 'تحذير انتهاء الصلاحية: {item_name}',
        subject_en: 'Expiry Warning: {item_name}',
        body_ar: 'الصنف {item_name} سينتهي خلال {days} أيام. رقم الدفعة: {lot_number}.',
        body_en: 'Item {item_name} will expire in {days} days. Lot number: {lot_number}.',
        trigger_event: 'EXPIRY_WARNING',
        is_active: true,
      },
    ],
    meta: { page: 1, page_size: 10, total: 2, total_pages: 1 },
  },

  'GET /notifications/templates/tmpl-1': {
    id: 'tmpl-1',
    code: 'LOW_STOCK_ALERT',
    subject_ar: 'تنبيه نقص المخزون: {item_name}',
    subject_en: 'Low Stock Alert: {item_name}',
    body_ar: 'الصنف {item_name} وصل إلى مستوى مخزون منخفض. الكمية الحالية: {qty}.',
    body_en: 'Item {item_name} has reached a low stock level. Current quantity: {qty}.',
    trigger_event: 'LOW_STOCK',
    is_active: true,
  },

  'GET /notifications/templates/tmpl-2': {
    id: 'tmpl-2',
    code: 'EXPIRY_WARNING',
    subject_ar: 'تحذير انتهاء الصلاحية: {item_name}',
    subject_en: 'Expiry Warning: {item_name}',
    body_ar: 'الصنف {item_name} سينتهي خلال {days} أيام. رقم الدفعة: {lot_number}.',
    body_en: 'Item {item_name} will expire in {days} days. Lot number: {lot_number}.',
    trigger_event: 'EXPIRY_WARNING',
    is_active: true,
  },

  'PUT /notifications/templates/tmpl-1': {
    id: 'tmpl-1',
    code: 'LOW_STOCK_ALERT',
    subject_ar: 'تنبيه نقص المخزون: {item_name} (معدّل)',
    subject_en: 'Low Stock Alert: {item_name} (Edited)',
    body_ar: 'الصنف {item_name} وصل إلى مستوى مخزون منخفض. الكمية الحالية: {qty}.',
    body_en: 'Item {item_name} has reached a low stock level. Current quantity: {qty}.',
    trigger_event: 'LOW_STOCK',
    is_active: true,
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
    ],
    meta: { page: 1, page_size: 10, total: 3, total_pages: 1 },
  },
};