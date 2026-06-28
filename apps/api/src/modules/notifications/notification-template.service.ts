import {
  Injectable,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { Role, OutboxStatus, EmailTemplate, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DEFAULT_EMAIL_TEMPLATES } from './default-templates.data';

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
export class NotificationTemplateService implements OnModuleInit {
  private readonly logger = new Logger(NotificationTemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultTemplates();
  }

  private async seedDefaultTemplates() {
    this.logger.log('Checking and seeding default email templates...');
    try {
      for (const defaultTemplate of DEFAULT_EMAIL_TEMPLATES) {
        const exists = await this.prisma.emailTemplate.findUnique({
          where: { code: defaultTemplate.code },
        });
        if (!exists) {
          this.logger.log(
            `Seeding default email template for code: ${defaultTemplate.code}`,
          );
          await this.prisma.emailTemplate.create({
            data: {
              code: defaultTemplate.code,
              subjectAr: defaultTemplate.subject_ar,
              subjectEn: defaultTemplate.subject_en,
              bodyAr: defaultTemplate.body_ar,
              bodyEn: defaultTemplate.body_en,
              triggerEvent: defaultTemplate.trigger_event,
              isActive: defaultTemplate.is_active,
              allowedParameters: defaultTemplate.allowed_parameters,
            },
          });
        } else {
          let needsUpdate = false;
          const updateData: {
            subjectAr?: string;
            subjectEn?: string;
            bodyAr?: string;
            bodyEn?: string;
          } = {};

          if (
            exists.subjectAr &&
            exists.subjectAr.toLowerCase().includes('logirest')
          ) {
            updateData.subjectAr = exists.subjectAr.replace(
              /logirest/gi,
              'مطاعم أوتانتك',
            );
            needsUpdate = true;
          }
          if (
            exists.subjectEn &&
            exists.subjectEn.toLowerCase().includes('logirest')
          ) {
            updateData.subjectEn = exists.subjectEn.replace(
              /logirest/gi,
              'Otantik Restaurants',
            );
            needsUpdate = true;
          }
          if (
            exists.bodyAr &&
            exists.bodyAr.toLowerCase().includes('logirest')
          ) {
            updateData.bodyAr = exists.bodyAr.replace(
              /logirest/gi,
              'مطاعم أوتانتك',
            );
            needsUpdate = true;
          }
          if (
            exists.bodyEn &&
            exists.bodyEn.toLowerCase().includes('logirest')
          ) {
            updateData.bodyEn = exists.bodyEn.replace(
              /logirest/gi,
              'Otantik Restaurants',
            );
            needsUpdate = true;
          }

          if (needsUpdate) {
            this.logger.log(
              `Updating brand name in email template for code: ${defaultTemplate.code}`,
            );
            await this.prisma.emailTemplate.update({
              where: { id: exists.id },
              data: updateData,
            });
          }
        }
      }
    } catch (err) {
      // Ignore seeding errors in tests or during initial setup before DB connection is ready
    }
  }

  private mapToNotificationTemplate(
    dbTemplate: EmailTemplate,
  ): NotificationTemplate {
    return {
      id: dbTemplate.id,
      code: dbTemplate.code,
      subject_ar: dbTemplate.subjectAr || '',
      subject_en: dbTemplate.subjectEn || '',
      body_ar: dbTemplate.bodyAr || '',
      body_en: dbTemplate.bodyEn || '',
      trigger_event: dbTemplate.triggerEvent,
      is_active: dbTemplate.isActive,
      allowed_parameters:
        (dbTemplate.allowedParameters as unknown as TemplateParameter[]) || [],
    };
  }

  public async resolveRecipientEmails(
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

    if (eventType === 'PR_APPROVED' || eventType === 'PR_REJECTED') {
      if (data.createdById) {
        const creator = await this.prisma.user.findUnique({
          where: { id: data.createdById, isActive: true },
          select: { email: true },
        });
        if (creator) return creator.email;
      }
      if (eventType === 'PR_REJECTED') return '';
      // Fallback for PR_APPROVED
      const users = await this.prisma.user.findMany({
        where: { role: Role.PROC_OFFICER, isActive: true },
        select: { email: true },
      });
      return users.map((u) => u.email).join(', ');
    }

    if (eventType === 'TRANSFER_SHIPPED') {
      const receivingWhId = data.warehouseId || data.toWarehouseId;
      if (!receivingWhId) return '';
      const keepers = await this.prisma.user.findMany({
        where: {
          role: Role.WH_KEEPER,
          isActive: true,
          warehouseScopes: {
            some: { warehouseId: receivingWhId },
          },
        },
        select: { email: true },
      });
      return keepers.map((u) => u.email).join(', ');
    }

    if (eventType === 'TRANSFER_RECEIVED') {
      const sendingWhId = data.fromWarehouseId;
      const keepers = sendingWhId
        ? await this.prisma.user.findMany({
            where: {
              role: Role.WH_KEEPER,
              isActive: true,
              warehouseScopes: {
                some: { warehouseId: sendingWhId },
              },
            },
            select: { email: true },
          })
        : [];
      const managers = await this.prisma.user.findMany({
        where: { role: Role.INV_MGR, isActive: true },
        select: { email: true },
      });
      const emails = new Set([
        ...keepers.map((u) => u.email),
        ...managers.map((u) => u.email),
      ]);
      return Array.from(emails).join(', ');
    }

    if (
      eventType === 'EXPIRY_WARNING' ||
      eventType === 'EXPIRY_WARNING_ALERT'
    ) {
      const whId = data.warehouseId;
      const keepers = whId
        ? await this.prisma.user.findMany({
            where: {
              role: Role.WH_KEEPER,
              isActive: true,
              warehouseScopes: {
                some: { warehouseId: whId },
              },
            },
            select: { email: true },
          })
        : [];
      const managers = await this.prisma.user.findMany({
        where: { role: Role.INV_MGR, isActive: true },
        select: { email: true },
      });
      const emails = new Set([
        ...keepers.map((u) => u.email),
        ...managers.map((u) => u.email),
      ]);
      return Array.from(emails).join(', ');
    }

    if (eventType === 'STOCKTAKE_STARTED') {
      const whId = data.warehouseId;
      if (!whId) return '';
      const keepers = await this.prisma.user.findMany({
        where: {
          role: Role.WH_KEEPER,
          isActive: true,
          warehouseScopes: {
            some: { warehouseId: whId },
          },
        },
        select: { email: true },
      });
      return keepers.map((u) => u.email).join(', ');
    }

    if (eventType === 'KITCHEN_REQUEST_SUBMITTED') {
      const whId = data.warehouseId;
      if (!whId) return '';
      const keepers = await this.prisma.user.findMany({
        where: {
          role: Role.WH_KEEPER,
          isActive: true,
          warehouseScopes: {
            some: { warehouseId: whId },
          },
        },
        select: { email: true },
      });
      return keepers.map((u) => u.email).join(', ');
    }

    if (eventType === 'KITCHEN_REQUEST_POSTED') {
      if (data.requestedById) {
        const chief = await this.prisma.user.findUnique({
          where: { id: data.requestedById, isActive: true },
          select: { email: true },
        });
        if (chief) return chief.email;
      }
      return '';
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
      case 'GRN_POSTED':
        targetRoles = [Role.PROC_MGR, Role.APPROVER, Role.GM];
        break;
      case 'LOW_STOCK_ALERT':
        targetRoles = [Role.INV_MGR, Role.PROC_MGR];
        break;
      case 'ADJUSTMENT_POSTED':
        targetRoles = [Role.ADMIN, Role.GM, Role.INV_MGR];
        break;
      case 'STOCKTAKE_POSTED':
        targetRoles = [Role.ADMIN, Role.GM];
        break;
      case 'PO_APPROVED':
        targetRoles = [Role.PROC_MGR, Role.APPROVER, Role.GM];
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

  public renderEventSubject(eventType: string, payload: unknown): string {
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
      case 'PR_REJECTED':
        return `Your PR ${docNo} has been rejected`;
      case 'GRN_POSTED':
        return `GRN ${docNo} posted — stock updated`;
      case 'KITCHEN_REQUEST_SUBMITTED':
        return `Kitchen Request ${docNo} submitted`;
      case 'TRANSFER_SHIPPED':
        return `Transfer ${docNo} in transit to you`;
      case 'TRANSFER_RECEIVED':
        return `Transfer ${docNo} Received`;
      case 'LOW_STOCK_ALERT':
        return `⚠️ Low stock: ${data.itemName || 'Item'} in ${data.warehouseName || 'Warehouse'}`;
      case 'EXPIRY_WARNING':
        return `⚠️ Expiry Alert: ${data.itemName || 'Item'} in ${data.warehouseName || 'Warehouse'} expiring soon`;
      case 'SUPPLIER_PO_NOTIFIED':
        return `Purchase Order ${docNo} Approved`;
      case 'SUPPLIER_GRN_NOTIFIED':
        return `Goods Receipt Confirmed for PO/GRN ${docNo}`;
      case 'PASSWORD_RESET_REQUESTED':
        return '🔐 Otantik Restaurant Password Reset Request';
      case 'ADJUSTMENT_POSTED':
        return `Stock Adjustment Posted — ${docNo}`;
      case 'STOCKTAKE_POSTED':
        return `Stocktake Finalized — ${docNo}`;
      case 'PO_APPROVED':
        return `Purchase Order ${docNo} Approved`;
      default:
        return `Inventory notification: ${eventType}`;
    }
  }

  private triggerEvents: TriggerEvent[] = [
    {
      code: 'LOW_STOCK_ALERT',
      name_ar: 'انخفاض المخزون (تنبيه)',
      name_en: 'Low Stock Alert',
      entity_type: 'Item',
      description:
        'Triggered when the inventory level of an item drops below its defined minimum threshold during stock deduction.',
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
      code: 'GRN_POSTED',
      name_ar: 'ترحيل إشعار استلام البضائع',
      name_en: 'Goods Received Note Posted',
      entity_type: 'GoodsReceivedNote',
      description:
        'Triggered when a Goods Received Note is posted and warehouse stock levels are physically updated.',
      suggested_fields: ['documentNumber', 'warehouseName', 'userName'],
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
    {
      code: 'ADJUSTMENT_POSTED',
      name_ar: 'ترحيل تسوية مخزنية',
      name_en: 'Stock Adjustment Posted',
      entity_type: 'Adjustment',
      description:
        'Triggered when a stock adjustment is posted and inventory ledger balances are reconciled.',
      suggested_fields: ['documentNumber', 'warehouseName', 'userName'],
    },
    {
      code: 'STOCKTAKE_POSTED',
      name_ar: 'ترحيل الجرد المخزني',
      name_en: 'Stocktake Finalized',
      entity_type: 'Stocktake',
      description:
        'Triggered when a stocktake session is finalized and posted.',
      suggested_fields: ['documentNumber', 'warehouseName', 'userName'],
    },
    {
      code: 'TRANSFER_SHIPPED',
      name_ar: 'شحن التحويل المخزني',
      name_en: 'Warehouse Transfer Dispatched',
      entity_type: 'Transfer',
      description:
        'Triggered when a warehouse transfer is dispatched and in transit.',
      suggested_fields: ['documentNumber', 'warehouseName', 'userName'],
    },
    {
      code: 'TRANSFER_RECEIVED',
      name_ar: 'استلام التحويل المخزني',
      name_en: 'Warehouse Transfer Received',
      entity_type: 'Transfer',
      description:
        'Triggered when a warehouse transfer is fully received at the destination.',
      suggested_fields: ['documentNumber', 'warehouseName', 'userName'],
    },
    {
      code: 'PR_APPROVED',
      name_ar: 'الموافقة على طلب الشراء',
      name_en: 'Purchase Request Approved',
      entity_type: 'PurchaseRequest',
      description:
        'Triggered when a Purchase Request is approved by management.',
      suggested_fields: ['documentNumber', 'warehouseName', 'userName'],
    },
    {
      code: 'PR_REJECTED',
      name_ar: 'رفض طلب الشراء',
      name_en: 'Purchase Request Rejected',
      entity_type: 'PurchaseRequest',
      description:
        'Triggered when a Purchase Request is rejected by management.',
      suggested_fields: ['documentNumber', 'warehouseName', 'userName'],
    },
    {
      code: 'PO_APPROVED',
      name_ar: 'الموافقة على أمر الشراء',
      name_en: 'Purchase Order Approved',
      entity_type: 'PurchaseOrder',
      description: 'Triggered when a Purchase Order is approved by management.',
      suggested_fields: ['documentNumber', 'warehouseName', 'userName'],
    },
    {
      code: 'KITCHEN_REQUEST_SUBMITTED',
      name_ar: 'تقديم طلب مطبخ',
      name_en: 'Kitchen Request Submitted',
      entity_type: 'KitchenRequest',
      description:
        'Triggered when a Kitchen Chief submits a new stock request.',
      suggested_fields: ['documentNumber', 'warehouseName', 'userName'],
    },
    {
      code: 'KITCHEN_REQUEST_POSTED',
      name_ar: 'ترحيل طلب مطبخ',
      name_en: 'Kitchen Request Posted',
      entity_type: 'KitchenRequest',
      description:
        'Triggered when the warehouse posts/fulfills a kitchen stock request.',
      suggested_fields: ['documentNumber', 'warehouseName', 'userName'],
    },
    {
      code: 'EXPIRY_WARNING_ALERT',
      name_ar: 'تنبيه انتهاء صلاحية شحنة (30 يوماً)',
      name_en: 'Expiry Warning Alert (30 Days)',
      entity_type: 'ExpiryWarning',
      description:
        'Triggered by daily job when a batch approaches its expiration date within 30 days.',
      suggested_fields: [
        'lotNumber',
        'itemName',
        'sku',
        'warehouseName',
        'expiryDate',
      ],
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
        field: 'documentNumber',
        type: 'string',
        label_en: 'PO Number',
        label_ar: 'رقم طلب الشراء',
        sample_value: 'PO-2026-0001',
      },
      {
        entity: 'PurchaseOrder',
        field: 'warehouseName',
        type: 'string',
        label_en: 'Warehouse Name',
        label_ar: 'اسم المستودع',
        sample_value: 'Main Store',
      },
      {
        entity: 'PurchaseOrder',
        field: 'userName',
        type: 'string',
        label_en: 'User Name',
        label_ar: 'اسم المستخدم',
        sample_value: 'Ahmad Manager',
      },
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
        field: 'documentNumber',
        type: 'string',
        label_en: 'Transfer Number',
        label_ar: 'رقم التحويل',
        sample_value: 'TR-2026-0001',
      },
      {
        entity: 'Transfer',
        field: 'warehouseName',
        type: 'string',
        label_en: 'Warehouse Name',
        label_ar: 'اسم المستودع',
        sample_value: 'Main Store',
      },
      {
        entity: 'Transfer',
        field: 'userName',
        type: 'string',
        label_en: 'User Name',
        label_ar: 'اسم المستخدم',
        sample_value: 'Ahmad Manager',
      },
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
    Adjustment: [
      {
        entity: 'Adjustment',
        field: 'documentNumber',
        type: 'string',
        label_en: 'Document Number',
        label_ar: 'رقم المستند',
        sample_value: 'ADJ-2026-0001',
      },
      {
        entity: 'Adjustment',
        field: 'warehouseName',
        type: 'string',
        label_en: 'Warehouse Name',
        label_ar: 'اسم المستودع',
        sample_value: 'Main Store',
      },
      {
        entity: 'Adjustment',
        field: 'userName',
        type: 'string',
        label_en: 'User Name',
        label_ar: 'اسم المستخدم',
        sample_value: 'Ahmad Manager',
      },
    ],
    Stocktake: [
      {
        entity: 'Stocktake',
        field: 'documentNumber',
        type: 'string',
        label_en: 'Document Number',
        label_ar: 'رقم المستند',
        sample_value: 'ST-2026-0001',
      },
      {
        entity: 'Stocktake',
        field: 'warehouseName',
        type: 'string',
        label_en: 'Warehouse Name',
        label_ar: 'اسم المستودع',
        sample_value: 'Main Store',
      },
      {
        entity: 'Stocktake',
        field: 'userName',
        type: 'string',
        label_en: 'User Name',
        label_ar: 'اسم المستخدم',
        sample_value: 'Ahmad Manager',
      },
    ],
    PurchaseRequest: [
      {
        entity: 'PurchaseRequest',
        field: 'documentNumber',
        type: 'string',
        label_en: 'Document Number',
        label_ar: 'رقم المستند',
        sample_value: 'PR-2026-0001',
      },
      {
        entity: 'PurchaseRequest',
        field: 'warehouseName',
        type: 'string',
        label_en: 'Warehouse Name',
        label_ar: 'اسم المستودع',
        sample_value: 'Main Store',
      },
      {
        entity: 'PurchaseRequest',
        field: 'userName',
        type: 'string',
        label_en: 'User Name',
        label_ar: 'اسم المستخدم',
        sample_value: 'Ahmad Manager',
      },
    ],
    KitchenRequest: [
      {
        entity: 'KitchenRequest',
        field: 'documentNumber',
        type: 'string',
        label_en: 'Request Number',
        label_ar: 'رقم الطلب',
        sample_value: 'KR-2026-0001',
      },
      {
        entity: 'KitchenRequest',
        field: 'warehouseName',
        type: 'string',
        label_en: 'Warehouse Name',
        label_ar: 'اسم المستودع',
        sample_value: 'Main Kitchen',
      },
      {
        entity: 'KitchenRequest',
        field: 'userName',
        type: 'string',
        label_en: 'User Name',
        label_ar: 'اسم المستخدم',
        sample_value: 'Chef Ahmad',
      },
    ],
    ExpiryWarning: [
      {
        entity: 'ExpiryWarning',
        field: 'lotNumber',
        type: 'string',
        label_en: 'Lot Number',
        label_ar: 'رقم التشغيلة',
        sample_value: 'LOT-12345',
      },
      {
        entity: 'ExpiryWarning',
        field: 'itemName',
        type: 'string',
        label_en: 'Item Name',
        label_ar: 'اسم الصنف',
        sample_value: 'Fresh Milk',
      },
      {
        entity: 'ExpiryWarning',
        field: 'sku',
        type: 'string',
        label_en: 'SKU',
        label_ar: 'رمز الصنف',
        sample_value: 'MILK-001',
      },
      {
        entity: 'ExpiryWarning',
        field: 'warehouseName',
        type: 'string',
        label_en: 'Warehouse Name',
        label_ar: 'اسم المستودع',
        sample_value: 'Main Chill Store',
      },
      {
        entity: 'ExpiryWarning',
        field: 'expiryDate',
        type: 'date',
        label_en: 'Expiry Date',
        label_ar: 'تاريخ انتهاء الصلاحية',
        sample_value: '2026-07-21',
      },
    ],
  };

  async findAll(page = 1) {
    const limit = 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.emailTemplate.count(),
      this.prisma.emailTemplate.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: data.map((t) => this.mapToNotificationTemplate(t)),
      meta: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string): Promise<NotificationTemplate> {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return this.mapToNotificationTemplate(template);
  }

  async create(
    body: CreateNotificationTemplateDto,
  ): Promise<NotificationTemplate> {
    const dbTemplate = await this.prisma.emailTemplate.create({
      data: {
        code: body.code,
        subjectAr: body.subject_ar || '',
        subjectEn: body.subject_en || '',
        bodyAr: body.body_ar || '',
        bodyEn: body.body_en || '',
        triggerEvent: body.trigger_event,
        isActive: body.is_active !== undefined ? body.is_active : true,
        allowedParameters:
          body.allowed_parameters !== undefined
            ? (body.allowed_parameters as unknown as Prisma.InputJsonValue)
            : undefined,
      },
    });
    return this.mapToNotificationTemplate(dbTemplate);
  }

  async update(
    id: string,
    body: UpdateNotificationTemplateDto,
  ): Promise<NotificationTemplate> {
    const existing = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    const dbTemplate = await this.prisma.emailTemplate.update({
      where: { id },
      data: {
        code: body.code !== undefined ? body.code : undefined,
        subjectAr: body.subject_ar !== undefined ? body.subject_ar : undefined,
        subjectEn: body.subject_en !== undefined ? body.subject_en : undefined,
        bodyAr: body.body_ar !== undefined ? body.body_ar : undefined,
        bodyEn: body.body_en !== undefined ? body.body_en : undefined,
        triggerEvent:
          body.trigger_event !== undefined ? body.trigger_event : undefined,
        isActive: body.is_active !== undefined ? body.is_active : undefined,
        allowedParameters:
          body.allowed_parameters !== undefined
            ? (body.allowed_parameters as unknown as Prisma.InputJsonValue)
            : undefined,
      },
    });
    return this.mapToNotificationTemplate(dbTemplate);
  }

  async remove(id: string) {
    const existing = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    await this.prisma.emailTemplate.delete({
      where: { id },
    });
    return { success: true, id };
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
