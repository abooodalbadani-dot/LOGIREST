import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface TemplateParameter {
  name: string;
  label_ar: string;
  label_en: string;
  sample_value: string;
  entity?: string;
  field_path?: string;
}

export interface NotificationTemplate {
  id: string;
  code: string;
  subject_ar: string;
  subject_en: string;
  body_ar: string;
  body_en: string;
  trigger_event: string;
  is_active: boolean;
  allowed_parameters: TemplateParameter[];
}

export interface EmailOutboxEntry {
  id: string;
  template_id: string;
  recipient_email: string;
  subject: string;
  sent_at: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED';
  error_message: string | null;
}

export interface TriggerEvent {
  code: string;
  name_ar: string;
  name_en: string;
  entity_type: string;
  description: string;
  suggested_fields: string[];
}

export interface EntityField {
  entity: string;
  field: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  label_ar: string;
  label_en: string;
  sample_value: string;
}

@Injectable()
export class NotificationTemplateService {
  private templates: NotificationTemplate[] = [
    {
      id: 'tmpl-1',
      code: 'LOW_STOCK_ALERT',
      subject_ar: 'تنبيه انخفاض المخزون: {{item_name}}',
      subject_en: 'Low Stock Alert: {{item_name}}',
      body_ar: 'الصنف {{item_name}} (رمز: {{item_sku}}) وصل إلى كمية منخفضة {{item_currentStock}} في {{item_warehouse}}.',
      body_en: 'Item {{item_name}} (SKU: {{item_sku}}) reached low quantity of {{item_currentStock}} in {{item_warehouse}}.',
      trigger_event: 'LOW_STOCK',
      is_active: true,
      allowed_parameters: [
        { name: 'item_name', label_en: 'Item Name', label_ar: 'اسم الصنف', sample_value: 'Tomato Paste', entity: 'Item', field_path: 'name' },
        { name: 'item_sku', label_en: 'SKU', label_ar: 'رمز الصنف', sample_value: 'TOM-PAS-01', entity: 'Item', field_path: 'sku' },
        { name: 'item_currentStock', label_en: 'Current Stock', label_ar: 'المخزون الحالي', sample_value: '3.5', entity: 'Item', field_path: 'currentStock' },
        { name: 'item_warehouse', label_en: 'Warehouse', label_ar: 'المستودع', sample_value: 'Main Kitchen' }
      ]
    },
    {
      id: 'tmpl-2',
      code: 'PO_PENDING_APPROVAL',
      subject_ar: 'طلب شراء بانتظار الموافقة: {{purchaseorder_poNumber}}',
      subject_en: 'Purchase Order Pending Approval: {{purchaseorder_poNumber}}',
      body_ar: 'طلب الشراء رقم {{purchaseorder_poNumber}} بقيمة إجمالية {{purchaseorder_totalAmount}} بانتظار موافقتكم.',
      body_en: 'Purchase Order {{purchaseorder_poNumber}} with total amount {{purchaseorder_totalAmount}} is pending your approval.',
      trigger_event: 'PO_PENDING_APPROVAL',
      is_active: true,
      allowed_parameters: [
        { name: 'purchaseorder_poNumber', label_en: 'PO Number', label_ar: 'رقم طلب الشراء', sample_value: 'PO-2026-0001', entity: 'PurchaseOrder', field_path: 'poNumber' },
        { name: 'purchaseorder_totalAmount', label_en: 'Total Amount', label_ar: 'المبلغ الإجمالي', sample_value: '1500.00', entity: 'PurchaseOrder', field_path: 'totalAmount' },
        { name: 'purchaseorder_status', label_en: 'Status', label_ar: 'الحالة', sample_value: 'PENDING', entity: 'PurchaseOrder', field_path: 'status' }
      ]
    }
  ];

  private outbox: EmailOutboxEntry[] = [
    {
      id: 'outbox-1',
      template_id: 'tmpl-1',
      recipient_email: 'inv.manager@kitchenstore.com',
      subject: 'Low Stock Alert: Tomato Paste',
      sent_at: '2026-05-30T00:15:00.000Z',
      status: 'SENT',
      error_message: null
    },
    {
      id: 'outbox-2',
      template_id: 'tmpl-2',
      recipient_email: 'approver@kitchenstore.com',
      subject: 'Purchase Order Pending Approval: PO-2026-0001',
      sent_at: null,
      status: 'PENDING',
      error_message: null
    },
    {
      id: 'outbox-3',
      template_id: 'tmpl-1',
      recipient_email: 'wh.keeper@kitchenstore.com',
      subject: 'Low Stock Alert: Olive Oil',
      sent_at: '2026-05-29T18:22:11.000Z',
      status: 'FAILED',
      error_message: 'SMTP Connection Timeout'
    }
  ];

  private triggerEvents: TriggerEvent[] = [
    {
      code: 'LOW_STOCK',
      name_ar: 'انخفاض المخزون',
      name_en: 'Low Stock Level',
      entity_type: 'Item',
      description: 'Triggered when the inventory level of an item drops below its defined minimum threshold.',
      suggested_fields: ['name', 'sku', 'minQty', 'currentStock']
    },
    {
      code: 'PO_PENDING_APPROVAL',
      name_ar: 'طلب شراء بانتظار الموافقة',
      name_en: 'PO Pending Approval',
      entity_type: 'PurchaseOrder',
      description: 'Triggered when a purchase order is submitted and requires manager approval.',
      suggested_fields: ['poNumber', 'totalAmount', 'status']
    },
    {
      code: 'GRN_RECEIVED',
      name_ar: 'استلام بضاعة',
      name_en: 'Goods Received Note Received',
      entity_type: 'GoodsReceivedNote',
      description: 'Triggered when a goods received note is created and items are registered in the warehouse.',
      suggested_fields: ['grnNumber', 'receivedAt', 'status']
    },
    {
      code: 'TRANSFER_PENDING',
      name_ar: 'تحويل بانتظار الإرسال',
      name_en: 'Transfer Pending Dispatch',
      entity_type: 'Transfer',
      description: 'Triggered when a warehouse stock transfer is request and pending dispatch.',
      suggested_fields: ['transferNumber', 'status']
    }
  ];

  private parameterRegistry: Record<string, EntityField[]> = {
    Item: [
      { entity: 'Item', field: 'name', type: 'string', label_en: 'Item Name', label_ar: 'اسم الصنف', sample_value: 'Tomato Paste' },
      { entity: 'Item', field: 'sku', type: 'string', label_en: 'SKU', label_ar: 'رمز الصنف', sample_value: 'TOM-PAS-01' },
      { entity: 'Item', field: 'minQty', type: 'number', label_en: 'Minimum Quantity', label_ar: 'الحد الأدنى للكمية', sample_value: '10.0' },
      { entity: 'Item', field: 'currentStock', type: 'number', label_en: 'Current Stock', label_ar: 'المخزون الحالي', sample_value: '3.5' }
    ],
    PurchaseOrder: [
      { entity: 'PurchaseOrder', field: 'poNumber', type: 'string', label_en: 'PO Number', label_ar: 'رقم طلب الشراء', sample_value: 'PO-2026-0001' },
      { entity: 'PurchaseOrder', field: 'totalAmount', type: 'number', label_en: 'Total Amount', label_ar: 'المبلغ الإجمالي', sample_value: '1500.00' },
      { entity: 'PurchaseOrder', field: 'status', type: 'string', label_en: 'Status', label_ar: 'الحالة', sample_value: 'PENDING' }
    ],
    GoodsReceivedNote: [
      { entity: 'GoodsReceivedNote', field: 'grnNumber', type: 'string', label_en: 'GRN Number', label_ar: 'رقم إشعار الاستلام', sample_value: 'GRN-2026-0001' },
      { entity: 'GoodsReceivedNote', field: 'receivedAt', type: 'date', label_en: 'Received Date', label_ar: 'تاريخ الاستلام', sample_value: '2026-05-30' },
      { entity: 'GoodsReceivedNote', field: 'status', type: 'string', label_en: 'Status', label_ar: 'الحالة', sample_value: 'COMPLETED' }
    ],
    Transfer: [
      { entity: 'Transfer', field: 'transferNumber', type: 'string', label_en: 'Transfer Number', label_ar: 'رقم التحويل', sample_value: 'TR-2026-0001' },
      { entity: 'Transfer', field: 'status', type: 'string', label_en: 'Status', label_ar: 'الحالة', sample_value: 'PENDING_DISPATCH' }
    ]
  };

  findAll(page = 1) {
    const limit = 10;
    const startIndex = (page - 1) * limit;
    const data = this.templates.slice(startIndex, startIndex + limit);
    return {
      data,
      meta: {
        total: this.templates.length,
        page,
        last_page: Math.ceil(this.templates.length / limit),
      }
    };
  }

  findOne(id: string) {
    const template = this.templates.find(t => t.id === id);
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return template;
  }

  create(body: any) {
    const newTemplate: NotificationTemplate = {
      id: `tmpl-${Date.now()}`,
      code: body.code,
      subject_ar: body.subject_ar || '',
      subject_en: body.subject_en || '',
      body_ar: body.body_ar || '',
      body_en: body.body_en || '',
      trigger_event: body.trigger_event,
      is_active: body.is_active !== undefined ? body.is_active : true,
      allowed_parameters: body.allowed_parameters || [],
    };
    this.templates.push(newTemplate);
    return newTemplate;
  }

  update(id: string, body: any) {
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    const existing = this.templates[index];
    const updated: NotificationTemplate = {
      ...existing,
      code: body.code !== undefined ? body.code : existing.code,
      subject_ar: body.subject_ar !== undefined ? body.subject_ar : existing.subject_ar,
      subject_en: body.subject_en !== undefined ? body.subject_en : existing.subject_en,
      body_ar: body.body_ar !== undefined ? body.body_ar : existing.body_ar,
      body_en: body.body_en !== undefined ? body.body_en : existing.body_en,
      trigger_event: body.trigger_event !== undefined ? body.trigger_event : existing.trigger_event,
      is_active: body.is_active !== undefined ? body.is_active : existing.is_active,
      allowed_parameters: body.allowed_parameters !== undefined ? body.allowed_parameters : existing.allowed_parameters,
    };
    this.templates[index] = updated;
    return updated;
  }

  remove(id: string) {
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    const removed = this.templates.splice(index, 1)[0];
    return { success: true, id: removed.id };
  }

  getTriggerEvents() {
    return this.triggerEvents;
  }

  getParameterRegistry() {
    return this.parameterRegistry;
  }

  getOutbox(status?: string, page = 1) {
    const limit = 10;
    const filtered = status
      ? this.outbox.filter(e => e.status === status)
      : this.outbox;
    const startIndex = (page - 1) * limit;
    const data = filtered.slice(startIndex, startIndex + limit);

    return {
      data,
      meta: {
        total: filtered.length,
        page,
        last_page: Math.ceil(filtered.length / limit),
      }
    };
  }
}
