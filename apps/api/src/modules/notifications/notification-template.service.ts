import { Injectable, NotFoundException } from '@nestjs/common';
import { Role, OutboxStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

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

export class CreateNotificationTemplateDto {
  code!: string;
  subject_ar?: string;
  subject_en?: string;
  body_ar?: string;
  body_en?: string;
  trigger_event!: string;
  is_active?: boolean;
  allowed_parameters?: TemplateParameter[];
}

export class UpdateNotificationTemplateDto {
  code?: string;
  subject_ar?: string;
  subject_en?: string;
  body_ar?: string;
  body_en?: string;
  trigger_event?: string;
  is_active?: boolean;
  allowed_parameters?: TemplateParameter[];
}

export interface EmailOutboxEntry {
  id: string;
  templateId: string;
  recipientEmail: string;
  subject: string;
  sentAt: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED';
  errorMessage: string | null;
  warehouseId?: string | null;
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
  constructor(private readonly prisma: PrismaService) {}

  private async resolveRecipientEmails(
    eventType: string,
    payload: unknown,
  ): Promise<string> {
    const data = (payload || {}) as Record<string, string | undefined>;
    if (
      eventType === 'SUPPLIER_PO_NOTIFIED' ||
      eventType === 'SUPPLIER_GRN_NOTIFIED'
    ) {
      return data.supplierEmail || 'supplier@otantikrestuarant.com';
    }
    if (eventType === 'PASSWORD_RESET_REQUESTED') {
      return data.email || '';
    }

    let targetRoles: Role[] = [];
    switch (eventType) {
      case 'SECURITY_ALERT_REPLAY_ATTACK':
        targetRoles = [Role.ADMIN];
        break;
      case 'ISSUE_POSTED':
        targetRoles = [Role.ADMIN, Role.INV_MGR];
        break;
      case 'PR_SUBMITTED':
        targetRoles = [Role.APPROVER];
        break;
      case 'PR_APPROVED':
        if (data.createdById) {
          const creator = await this.prisma.user.findUnique({
            where: { id: data.createdById, isActive: true },
            select: { email: true },
          });
          if (creator) return creator.email;
        }
        targetRoles = [Role.PROC_OFFICER];
        break;
      case 'GRN_POSTED':
      case 'ADJUSTMENT_POSTED':
      case 'STOCKTAKE_POSTED':
      case 'LOW_STOCK_ALERT':
      case 'EXPIRY_WARNING':
        targetRoles = [Role.INV_MGR];
        if (
          eventType === 'ADJUSTMENT_POSTED' ||
          eventType === 'STOCKTAKE_POSTED'
        ) {
          targetRoles.push(Role.AUDITOR);
        }
        break;
      case 'KITCHEN_REQUEST_SUBMITTED':
      case 'TRANSFER_SHIPPED':
      case 'STOCKTAKE_STARTED':
      case 'TRANSFER_RECEIVED':
        targetRoles = [Role.WH_KEEPER];
        break;
      case 'KITCHEN_REQUEST_POSTED':
        targetRoles = [Role.KITCHEN_CHIEF];
        break;
      default:
        break;
    }

    if (targetRoles.length === 0) return '';
    const users = await this.prisma.user.findMany({
      where: { role: { in: targetRoles }, isActive: true },
      select: { email: true },
    });
    return users.map((u) => u.email).join(', ');
  }

  private renderEventSubject(eventType: string, payload: unknown): string {
    const data = (payload || {}) as Record<string, string | undefined>;
    const docNo = data.documentNumber || data.id || 'N/A';
    switch (eventType) {
      case 'SECURITY_ALERT_REPLAY_ATTACK':
        return '🚨 SECURITY ALERT: Token Replay Attack Detected';
      case 'ISSUE_POSTED':
        return `Stock Issue Posted — ${data.issueNumber || docNo} / تم ترحيل صرف مخزون`;
      case 'PR_SUBMITTED':
        return `Purchase Request ${docNo} awaiting approval`;
      case 'PR_APPROVED':
        return `Your PR ${docNo} has been approved`;
      case 'GRN_POSTED':
        return `GRN ${docNo} posted — stock updated`;
      case 'KITCHEN_REQUEST_SUBMITTED':
        return `Kitchen Request ${docNo} submitted`;
      case 'TRANSFER_SHIPPED':
        return `Transfer ${docNo} in transit to you`;
      case 'LOW_STOCK_ALERT':
        return `⚠️ Low stock: ${data.itemName || 'Item'} in ${data.warehouseName || 'Warehouse'}`;
      case 'EXPIRY_WARNING':
        return `⚠️ Expiry Alert: ${data.itemName || 'Item'} in ${data.warehouseName || 'Warehouse'} expiring soon`;
      case 'SUPPLIER_PO_NOTIFIED':
        return `Purchase Order ${docNo} Approved`;
      case 'SUPPLIER_GRN_NOTIFIED':
        return `Goods Receipt Confirmed for PO/GRN ${docNo}`;
      case 'PASSWORD_RESET_REQUESTED':
        return '🔐 Otantik Restuarant Password Reset Request';
      default:
        return `Inventory notification: ${eventType}`;
    }
  }

  private templates: NotificationTemplate[] = [
    {
      id: 'tmpl-1',
      code: 'LOW_STOCK_ALERT',
      subject_ar: 'تنبيه انخفاض المخزون: {{item_name}}',
      subject_en: 'Low Stock Alert: {{item_name}}',
      body_ar:
        'الصنف {{item_name}} (رمز: {{item_sku}}) وصل إلى كمية منخفضة {{item_currentStock}} في {{item_warehouse}}.',
      body_en:
        'Item {{item_name}} (SKU: {{item_sku}}) reached low quantity of {{item_currentStock}} in {{item_warehouse}}.',
      trigger_event: 'LOW_STOCK',
      is_active: true,
      allowed_parameters: [
        {
          name: 'item_name',
          label_en: 'Item Name',
          label_ar: 'اسم الصنف',
          sample_value: 'Tomato Paste',
          entity: 'Item',
          field_path: 'name',
        },
        {
          name: 'item_sku',
          label_en: 'SKU',
          label_ar: 'رمز الصنف',
          sample_value: 'TOM-PAS-01',
          entity: 'Item',
          field_path: 'sku',
        },
        {
          name: 'item_currentStock',
          label_en: 'Current Stock',
          label_ar: 'المخزون الحالي',
          sample_value: '3.5',
          entity: 'Item',
          field_path: 'currentStock',
        },
        {
          name: 'item_warehouse',
          label_en: 'Warehouse',
          label_ar: 'المستودع',
          sample_value: 'Main Kitchen',
        },
      ],
    },
    {
      id: 'tmpl-2',
      code: 'PO_PENDING_APPROVAL',
      subject_ar: 'طلب شراء بانتظار الموافقة: {{purchaseorder_poNumber}}',
      subject_en: 'Purchase Order Pending Approval: {{purchaseorder_poNumber}}',
      body_ar:
        'طلب الشراء رقم {{purchaseorder_poNumber}} بقيمة إجمالية {{purchaseorder_totalAmount}} بانتظار موافقتكم.',
      body_en:
        'Purchase Order {{purchaseorder_poNumber}} with total amount {{purchaseorder_totalAmount}} is pending your approval.',
      trigger_event: 'PO_PENDING_APPROVAL',
      is_active: true,
      allowed_parameters: [
        {
          name: 'purchaseorder_poNumber',
          label_en: 'PO Number',
          label_ar: 'رقم طلب الشراء',
          sample_value: 'PO-2026-0001',
          entity: 'PurchaseOrder',
          field_path: 'poNumber',
        },
        {
          name: 'purchaseorder_totalAmount',
          label_en: 'Total Amount',
          label_ar: 'المبلغ الإجمالي',
          sample_value: '1500.00',
          entity: 'PurchaseOrder',
          field_path: 'totalAmount',
        },
        {
          name: 'purchaseorder_status',
          label_en: 'Status',
          label_ar: 'الحالة',
          sample_value: 'PENDING',
          entity: 'PurchaseOrder',
          field_path: 'status',
        },
      ],
    },
  ];

  private outbox: EmailOutboxEntry[] = [
    {
      id: 'outbox-1',
      templateId: 'tmpl-1',
      recipientEmail: 'inv.manager@kitchenstore.com',
      subject: 'Low Stock Alert: Tomato Paste',
      sentAt: '2026-05-30T00:15:00.000Z',
      status: 'SENT',
      errorMessage: null,
      warehouseId: 'wh-main',
    },
    {
      id: 'outbox-2',
      templateId: 'tmpl-2',
      recipientEmail: 'approver@kitchenstore.com',
      subject: 'Purchase Order Pending Approval: PO-2026-0001',
      sentAt: null,
      status: 'PENDING',
      errorMessage: null,
      warehouseId: null,
    },
    {
      id: 'outbox-3',
      templateId: 'tmpl-1',
      recipientEmail: 'wh.keeper@kitchenstore.com',
      subject: 'Low Stock Alert: Olive Oil',
      sentAt: '2026-05-29T18:22:11.000Z',
      status: 'FAILED',
      errorMessage: 'SMTP Connection Timeout',
      warehouseId: 'wh-main',
    },
  ];

  private triggerEvents: TriggerEvent[] = [
    {
      code: 'LOW_STOCK',
      name_ar: 'انخفاض المخزون',
      name_en: 'Low Stock Level',
      entity_type: 'Item',
      description:
        'Triggered when the inventory level of an item drops below its defined minimum threshold.',
      suggested_fields: ['name', 'sku', 'minQty', 'currentStock'],
    },
    {
      code: 'PO_PENDING_APPROVAL',
      name_ar: 'طلب شراء بانتظار الموافقة',
      name_en: 'PO Pending Approval',
      entity_type: 'PurchaseOrder',
      description:
        'Triggered when a purchase order is submitted and requires manager approval.',
      suggested_fields: ['poNumber', 'totalAmount', 'status'],
    },
    {
      code: 'GRN_RECEIVED',
      name_ar: 'استلام بضاعة',
      name_en: 'Goods Received Note Received',
      entity_type: 'GoodsReceivedNote',
      description:
        'Triggered when a goods received note is created and items are registered in the warehouse.',
      suggested_fields: ['grnNumber', 'receivedAt', 'status'],
    },
    {
      code: 'TRANSFER_PENDING',
      name_ar: 'تحويل بانتظار الإرسال',
      name_en: 'Transfer Pending Dispatch',
      entity_type: 'Transfer',
      description:
        'Triggered when a warehouse stock transfer is request and pending dispatch.',
      suggested_fields: ['transferNumber', 'status'],
    },
  ];

  private parameterRegistry: Record<string, EntityField[]> = {
    Item: [
      {
        entity: 'Item',
        field: 'name',
        type: 'string',
        label_en: 'Item Name',
        label_ar: 'اسم الصنف',
        sample_value: 'Tomato Paste',
      },
      {
        entity: 'Item',
        field: 'sku',
        type: 'string',
        label_en: 'SKU',
        label_ar: 'رمز الصنف',
        sample_value: 'TOM-PAS-01',
      },
      {
        entity: 'Item',
        field: 'minQty',
        type: 'number',
        label_en: 'Minimum Quantity',
        label_ar: 'الحد الأدنى للكمية',
        sample_value: '10.0',
      },
      {
        entity: 'Item',
        field: 'currentStock',
        type: 'number',
        label_en: 'Current Stock',
        label_ar: 'المخزون الحالي',
        sample_value: '3.5',
      },
    ],
    PurchaseOrder: [
      {
        entity: 'PurchaseOrder',
        field: 'poNumber',
        type: 'string',
        label_en: 'PO Number',
        label_ar: 'رقم طلب الشراء',
        sample_value: 'PO-2026-0001',
      },
      {
        entity: 'PurchaseOrder',
        field: 'totalAmount',
        type: 'number',
        label_en: 'Total Amount',
        label_ar: 'المبلغ الإجمالي',
        sample_value: '1500.00',
      },
      {
        entity: 'PurchaseOrder',
        field: 'status',
        type: 'string',
        label_en: 'Status',
        label_ar: 'الحالة',
        sample_value: 'PENDING',
      },
    ],
    GoodsReceivedNote: [
      {
        entity: 'GoodsReceivedNote',
        field: 'grnNumber',
        type: 'string',
        label_en: 'GRN Number',
        label_ar: 'رقم إشعار الاستلام',
        sample_value: 'GRN-2026-0001',
      },
      {
        entity: 'GoodsReceivedNote',
        field: 'receivedAt',
        type: 'date',
        label_en: 'Received Date',
        label_ar: 'تاريخ الاستلام',
        sample_value: '2026-05-30',
      },
      {
        entity: 'GoodsReceivedNote',
        field: 'status',
        type: 'string',
        label_en: 'Status',
        label_ar: 'الحالة',
        sample_value: 'COMPLETED',
      },
    ],
    Transfer: [
      {
        entity: 'Transfer',
        field: 'transferNumber',
        type: 'string',
        label_en: 'Transfer Number',
        label_ar: 'رقم التحويل',
        sample_value: 'TR-2026-0001',
      },
      {
        entity: 'Transfer',
        field: 'status',
        type: 'string',
        label_en: 'Status',
        label_ar: 'الحالة',
        sample_value: 'PENDING_DISPATCH',
      },
    ],
  };

  findAll(page = 1) {
    const limit = 10;
    const startIndex = (page - 1) * limit;
    const data = this.templates.slice(startIndex, startIndex + limit);
    const total = this.templates.length;
    return {
      data,
      meta: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  findOne(id: string) {
    const template = this.templates.find((t) => t.id === id);
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return template;
  }

  create(body: CreateNotificationTemplateDto) {
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

  update(id: string, body: UpdateNotificationTemplateDto) {
    const index = this.templates.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    const existing = this.templates[index];
    const updated: NotificationTemplate = {
      ...existing,
      code: body.code !== undefined ? body.code : existing.code,
      subject_ar:
        body.subject_ar !== undefined ? body.subject_ar : existing.subject_ar,
      subject_en:
        body.subject_en !== undefined ? body.subject_en : existing.subject_en,
      body_ar: body.body_ar !== undefined ? body.body_ar : existing.body_ar,
      body_en: body.body_en !== undefined ? body.body_en : existing.body_en,
      trigger_event:
        body.trigger_event !== undefined
          ? body.trigger_event
          : existing.trigger_event,
      is_active:
        body.is_active !== undefined ? body.is_active : existing.is_active,
      allowed_parameters:
        body.allowed_parameters !== undefined
          ? body.allowed_parameters
          : existing.allowed_parameters,
    };
    this.templates[index] = updated;
    return updated;
  }

  remove(id: string) {
    const index = this.templates.findIndex((t) => t.id === id);
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

  async getOutbox(status?: string, page = 1, allowedWarehouseIds?: string[]) {
    const limit = 10;
    const skip = (page - 1) * limit;

    let dbStatus: OutboxStatus | undefined = undefined;
    if (status === 'SENT') {
      dbStatus = 'SUCCEEDED';
    } else if (status) {
      dbStatus = status as OutboxStatus;
    }

    const where: { status?: OutboxStatus } = {};
    if (dbStatus) {
      where.status = dbStatus;
    }

    const [total, dbEvents] = await Promise.all([
      this.prisma.outboxEvent.count({ where }),
      this.prisma.outboxEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const data: EmailOutboxEntry[] = [];
    for (const event of dbEvents) {
      const payload = (event.payload || {}) as Record<string, unknown>;
      const warehouseId =
        typeof payload.warehouseId === 'string' ? payload.warehouseId : null;

      if (
        allowedWarehouseIds &&
        warehouseId &&
        !allowedWarehouseIds.includes(warehouseId)
      ) {
        continue;
      }

      const recipientEmail = await this.resolveRecipientEmails(
        event.eventType,
        payload,
      );
      const subject = this.renderEventSubject(event.eventType, payload);

      let mappedStatus: 'PENDING' | 'SENT' | 'FAILED' = 'PENDING';
      if (event.status === 'SUCCEEDED') {
        mappedStatus = 'SENT';
      } else if (event.status === 'FAILED') {
        mappedStatus = 'FAILED';
      }

      data.push({
        id: event.id,
        templateId: event.eventType,
        recipientEmail,
        subject,
        sentAt: event.processedAt ? event.processedAt.toISOString() : null,
        status: mappedStatus,
        errorMessage: event.lastError,
        warehouseId,
      });
    }

    return {
      data,
      meta: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async retryOutboxEvent(id: string) {
    const event = await this.prisma.outboxEvent.findUnique({
      where: { id },
    });
    if (!event) {
      throw new NotFoundException(`Outbox event with ID ${id} not found.`);
    }
    return this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'PENDING',
        attempts: 0,
        lastError: null,
      },
    });
  }
}
