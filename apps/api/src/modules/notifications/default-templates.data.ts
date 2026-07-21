export interface DefaultTemplate {
  id: string;
  code: string;
  subject_ar: string;
  subject_en: string;
  body_ar: string;
  body_en: string;
  trigger_event: string;
  is_active: boolean;
  allowed_parameters: Array<{
    name: string;
    label_en: string;
    label_ar: string;
    sample_value: string;
    entity?: string;
    field_path?: string;
  }>;
}

export const DEFAULT_EMAIL_TEMPLATES: DefaultTemplate[] = [
  {
    id: 'tmpl-low-stock-alert',
    code: 'LOW_STOCK_ALERT',
    subject_ar: 'تنبيه انخفاض المخزون: {{item_name}}',
    subject_en: 'Low Stock Alert: {{item_name}}',
    body_en: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #fffaf0; border-left: 4px solid #dd6b20; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #dd6b20; font-size: 16px;">⚠️ Low Stock Warning</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">The inventory level for item <strong>{{item_name}}</strong> (SKU: <strong>{{item_sku}}</strong>) has fallen below the defined minimum threshold.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">Warehouse:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{item_warehouse}}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">Current Stock:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #e53e3e;">{{item_currentStock}}</td>
          </tr>
        </table>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">This is an automated inventory alert from Otantik Restaurants.</p>
      </div>
    `,
    body_ar: `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; text-align: right; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #fffaf0; border-right: 4px solid #dd6b20; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #dd6b20; font-size: 16px;">⚠️ تنبيه انخفاض المخزون</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">انخفض مستوى مخزون الصنف <strong>{{item_name}}</strong> (رمز الصنف: <strong>{{item_sku}}</strong>) في مستودع <strong>{{item_warehouse}}</strong> عن الحد الأدنى المحدد.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; text-align: right;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">المستودع:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{item_warehouse}}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">المخزون الحالي:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #e53e3e;">{{item_currentStock}}</td>
          </tr>
        </table>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">هذا تنبيه تلقائي للمخزون من نظام مطاعم اوتانتك.</p>
      </div>
    `,
    trigger_event: 'LOW_STOCK_ALERT',
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
    id: 'tmpl-po-pending-approval',
    code: 'PO_PENDING_APPROVAL',
    subject_ar: 'طلب شراء بانتظار الموافقة: {{purchaseorder_poNumber}}',
    subject_en: 'Purchase Order Pending Approval: {{purchaseorder_poNumber}}',
    body_en: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #ebf8ff; border-left: 4px solid #3182ce; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #3182ce; font-size: 16px;">📋 Purchase Order Awaiting Approval</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">Purchase Order <strong>{{purchaseorder_poNumber}}</strong> requires your review and approval.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">Total Amount:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{purchaseorder_totalAmount}}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">Status:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #3182ce;">{{purchaseorder_status}}</td>
          </tr>
        </table>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">Please review this document in the Otantik Restaurants system.</p>
      </div>
    `,
    body_ar: `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; text-align: right; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #ebf8ff; border-right: 4px solid #3182ce; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #3182ce; font-size: 16px;">📋 أمر شراء بانتظار الموافقة</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">أمر الشراء رقم <strong>{{purchaseorder_poNumber}}</strong> يتطلب مراجعتكم واعتمادكم.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; text-align: right;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">المبلغ الإجمالي:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{purchaseorder_totalAmount}}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">الحالة:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #3182ce;">{{purchaseorder_status}}</td>
          </tr>
        </table>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">يرجى مراجعة هذا المستند واعتماده في نظام مطاعم اوتانتك.</p>
      </div>
    `,
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
  {
    id: 'tmpl-adjustment-posted',
    code: 'ADJUSTMENT_POSTED',
    subject_ar: 'ترحيل تسوية مخزنية: {{documentNumber}}',
    subject_en: 'Stock Adjustment Posted: {{documentNumber}}',
    body_en: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #f0fff4; border-left: 4px solid #38a169; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #38a169; font-size: 16px;">✅ Stock Adjustment Posted Successfully</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">Stock Adjustment <strong>{{documentNumber}}</strong> has been successfully finalized and posted.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">Warehouse:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{warehouseName}}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">Posted By:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{userName}}</td>
          </tr>
        </table>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">Otantik Restaurants Inventory Management System</p>
      </div>
    `,
    body_ar: `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; text-align: right; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #f0fff4; border-right: 4px solid #38a169; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #38a169; font-size: 16px;">✅ تم ترحيل التسوية المخزنية بنجاح</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">تم ترحيل واعتماد التسوية المخزنية رقم <strong>{{documentNumber}}</strong> بنجاح في النظام.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; text-align: right;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">المستودع:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{warehouseName}}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">بواسطة:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{userName}}</td>
          </tr>
        </table>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">نظام إدارة المخازن لمطاعم اوتانتك</p>
      </div>
    `,
    trigger_event: 'ADJUSTMENT_POSTED',
    is_active: true,
    allowed_parameters: [
      {
        name: 'documentNumber',
        label_en: 'Document Number',
        label_ar: 'رقم المستند',
        sample_value: 'ADJ-2026-0001',
      },
      {
        name: 'warehouseName',
        label_en: 'Warehouse Name',
        label_ar: 'اسم المستودع',
        sample_value: 'Main Store',
      },
      {
        name: 'userName',
        label_en: 'User Name',
        label_ar: 'اسم المستخدم',
        sample_value: 'Ahmad Manager',
      },
    ],
  },
  {
    id: 'tmpl-stocktake-posted',
    code: 'STOCKTAKE_POSTED',
    subject_ar: 'ترحيل الجرد المخزني: {{documentNumber}}',
    subject_en: 'Stocktake Finalized: {{documentNumber}}',
    body_en: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #f0fff4; border-left: 4px solid #38a169; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #38a169; font-size: 16px;">📈 Stocktake Finalized</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">The stocktake session <strong>{{documentNumber}}</strong> has been successfully verified and posted.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">Warehouse:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{warehouseName}}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">Finalized By:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{userName}}</td>
          </tr>
        </table>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">Otantik Restaurants System Notifications</p>
      </div>
    `,
    body_ar: `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; text-align: right; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #f0fff4; border-right: 4px solid #38a169; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #38a169; font-size: 16px;">📈 اعتماد الجرد المخزني</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">تم ترحيل واعتماد جلسة الجرد المخزني رقم <strong>{{documentNumber}}</strong> وتحديث أرصدة المخازن مطابقة للواقع.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; text-align: right;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">المستودع:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{warehouseName}}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">تم الاعتماد بواسطة:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{userName}}</td>
          </tr>
        </table>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">تنبيهات نظام مطاعم اوتانتك</p>
      </div>
    `,
    trigger_event: 'STOCKTAKE_POSTED',
    is_active: true,
    allowed_parameters: [
      {
        name: 'documentNumber',
        label_en: 'Document Number',
        label_ar: 'رقم المستند',
        sample_value: 'ST-2026-0001',
      },
      {
        name: 'warehouseName',
        label_en: 'Warehouse Name',
        label_ar: 'اسم المستودع',
        sample_value: 'Main Store',
      },
      {
        name: 'userName',
        label_en: 'User Name',
        label_ar: 'اسم المستخدم',
        sample_value: 'Ahmad Manager',
      },
    ],
  },
  {
    id: 'tmpl-transfer-shipped',
    code: 'TRANSFER_SHIPPED',
    subject_ar: 'شحن التحويل المخزني: {{documentNumber}}',
    subject_en: 'Warehouse Transfer Dispatched: {{documentNumber}}',
    body_en: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #f0fff4; border-left: 4px solid #38a169; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #38a169; font-size: 16px;">🚚 Stock Transfer in Transit</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">Stock Transfer <strong>{{documentNumber}}</strong> has been dispatched and is currently in transit.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">Origin Warehouse:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{warehouseName}}</td>
          </tr>
        </table>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">Otantik Restaurants Logistics Notifications</p>
      </div>
    `,
    body_ar: `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; text-align: right; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #f0fff4; border-right: 4px solid #38a169; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #38a169; font-size: 16px;">🚚 شحنة تحويل مخزني قيد الانتقال</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">تم شحن التحويل المخزني رقم <strong>{{documentNumber}}</strong> من مستودع المصدر وهو قيد الانتقال الآن.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; text-align: right;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">مستودع الشحن:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{warehouseName}}</td>
          </tr>
        </table>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">إشعارات الشحن واللوجستيات لمطاعم اوتانتك</p>
      </div>
    `,
    trigger_event: 'TRANSFER_SHIPPED',
    is_active: true,
    allowed_parameters: [
      {
        name: 'documentNumber',
        label_en: 'Document Number',
        label_ar: 'رقم المستند',
        sample_value: 'TR-2026-0001',
      },
      {
        name: 'warehouseName',
        label_en: 'Warehouse Name',
        label_ar: 'اسم المستودع',
        sample_value: 'Main Store',
      },
    ],
  },
  {
    id: 'tmpl-transfer-received',
    code: 'TRANSFER_RECEIVED',
    subject_ar: 'استلام التحويل المخزني: {{documentNumber}}',
    subject_en: 'Warehouse Transfer Received: {{documentNumber}}',
    body_en: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #f0fff4; border-left: 4px solid #38a169; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #38a169; font-size: 16px;">📥 Stock Transfer Fully Received</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">Stock Transfer <strong>{{documentNumber}}</strong> has been successfully received and verified at the destination.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">Destination Warehouse:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{warehouseName}}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">Received By:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{userName}}</td>
          </tr>
        </table>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">Otantik Restaurants Logistics Notifications</p>
      </div>
    `,
    body_ar: `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; text-align: right; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #f0fff4; border-right: 4px solid #38a169; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #38a169; font-size: 16px;">📥 تم استلام الشحنة وتأكيدها</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">تم استلام وتأكيد شحنة التحويل المخزني رقم <strong>{{documentNumber}}</strong> وفحصها بالكامل.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; text-align: right;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">مستودع الاستلام:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{warehouseName}}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">المستلم:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{userName}}</td>
          </tr>
        </table>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">إشعارات الشحن واللوجستيات لمطاعم اوتانتك</p>
      </div>
    `,
    trigger_event: 'TRANSFER_RECEIVED',
    is_active: true,
    allowed_parameters: [
      {
        name: 'documentNumber',
        label_en: 'Document Number',
        label_ar: 'رقم المستند',
        sample_value: 'TR-2026-0001',
      },
      {
        name: 'warehouseName',
        label_en: 'Warehouse Name',
        label_ar: 'اسم المستودع',
        sample_value: 'Main Store',
      },
      {
        name: 'userName',
        label_en: 'User Name',
        label_ar: 'اسم المستخدم',
        sample_value: 'Ahmad Manager',
      },
    ],
  },
  {
    id: 'tmpl-pr-approved',
    code: 'PR_APPROVED',
    subject_ar: 'الموافقة على طلب الشراء: {{documentNumber}}',
    subject_en: 'Purchase Request Approved: {{documentNumber}}',
    body_en: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #f0fff4; border-left: 4px solid #38a169; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #38a169; font-size: 16px;">✔️ Purchase Request Approved</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">Your Purchase Request <strong>{{documentNumber}}</strong> has been fully approved by the management board.</p>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">The procurement team has initiated the purchase workflow.</p>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">Otantik Restaurants Notifications</p>
      </div>
    `,
    body_ar: `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; text-align: right; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #f0fff4; border-right: 4px solid #38a169; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #38a169; font-size: 16px;">✔️ الموافقة على طلب الشراء</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">تمت الموافقة على طلب الشراء الخاص بك رقم <strong>{{documentNumber}}</strong> من قبل إدارة المشتريات.</p>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">بدأت الآن إجراءات تحويل طلب الشراء إلى أمر توريد.</p>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">تنبيهات نظام مطاعم اوتانتك</p>
      </div>
    `,
    trigger_event: 'PR_APPROVED',
    is_active: true,
    allowed_parameters: [
      {
        name: 'documentNumber',
        label_en: 'Document Number',
        label_ar: 'رقم المستند',
        sample_value: 'PR-2026-0001',
      },
    ],
  },
  {
    id: 'tmpl-pr-rejected',
    code: 'PR_REJECTED',
    subject_ar: 'رفض طلب الشراء: {{documentNumber}}',
    subject_en: 'Purchase Request Rejected: {{documentNumber}}',
    body_en: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #fff5f5; border-left: 4px solid #e53e3e; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #e53e3e; font-size: 16px;">❌ Purchase Request Rejected</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">Your Purchase Request <strong>{{documentNumber}}</strong> has been rejected by management.</p>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">Please check comments or reasons inside the dashboard workflow history.</p>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">Otantik Restaurants System</p>
      </div>
    `,
    body_ar: `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; text-align: right; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #fff5f5; border-right: 4px solid #e53e3e; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #e53e3e; font-size: 16px;">❌ رفض طلب الشراء</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">تم رفض طلب الشراء رقم <strong>{{documentNumber}}</strong> من قبل إدارة المشتريات.</p>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">يرجى مراجعة تفاصيل الرفض أو الملاحظات عبر لوحة التحكم الخاصة بك.</p>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">نظام مطاعم اوتانتك</p>
      </div>
    `,
    trigger_event: 'PR_REJECTED',
    is_active: true,
    allowed_parameters: [
      {
        name: 'documentNumber',
        label_en: 'Document Number',
        label_ar: 'رقم المستند',
        sample_value: 'PR-2026-0001',
      },
    ],
  },
  {
    id: 'tmpl-po-approved',
    code: 'PO_APPROVED',
    subject_ar: 'الموافقة على أمر الشراء: {{documentNumber}}',
    subject_en: 'Purchase Order Approved: {{documentNumber}}',
    body_en: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #f0fff4; border-left: 4px solid #38a169; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #38a169; font-size: 16px;">✔️ Purchase Order Approved</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">Purchase Order <strong>{{documentNumber}}</strong> has been approved by the board and is now active.</p>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">Otantik Restaurants Notifications</p>
      </div>
    `,
    body_ar: `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; text-align: right; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #f0fff4; border-right: 4px solid #38a169; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #38a169; font-size: 16px;">✔️ الموافقة على أمر الشراء</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">تمت الموافقة على أمر الشراء رقم <strong>{{documentNumber}}</strong> وأصبح نشطاً وقابلاً للتوريد.</p>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">تنبيهات نظام مطاعم اوتانتك</p>
      </div>
    `,
    trigger_event: 'PO_APPROVED',
    is_active: true,
    allowed_parameters: [
      {
        name: 'documentNumber',
        label_en: 'Document Number',
        label_ar: 'رقم المستند',
        sample_value: 'PO-2026-0001',
      },
    ],
  },
  {
    id: 'tmpl-kitchen-request-submitted',
    code: 'KITCHEN_REQUEST_SUBMITTED',
    subject_ar: 'تقديم طلب مطبخ جديد: {{documentNumber}}',
    subject_en: 'New Kitchen Request Submitted: {{documentNumber}}',
    body_en: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #ebf8ff; border-left: 4px solid #3182ce; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #3182ce; font-size: 16px;">🍳 Kitchen Request Submitted</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">A new Kitchen Request <strong>{{documentNumber}}</strong> has been submitted and is awaiting preparation.</p>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">Otantik Restaurants Kitchen Management System</p>
      </div>
    `,
    body_ar: `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; text-align: right; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #ebf8ff; border-right: 4px solid #3182ce; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #3182ce; font-size: 16px;">🍳 تقديم طلب مطبخ جديد</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">تم تقديم طلب مطبخ جديد رقم <strong>{{documentNumber}}</strong> بنجاح وهو بانتظار التحضير والصرف من المخزن.</p>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">إدارة المطابخ لمطاعم اوتانتك</p>
      </div>
    `,
    trigger_event: 'KITCHEN_REQUEST_SUBMITTED',
    is_active: true,
    allowed_parameters: [
      {
        name: 'documentNumber',
        label_en: 'Document Number',
        label_ar: 'رقم المستند',
        sample_value: 'KR-2026-0001',
      },
    ],
  },
  {
    id: 'tmpl-kitchen-request-posted',
    code: 'KITCHEN_REQUEST_POSTED',
    subject_ar: 'صرف طلب المطبخ: {{documentNumber}}',
    subject_en: 'Kitchen Request Fulfilled: {{documentNumber}}',
    body_en: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #f0fff4; border-left: 4px solid #38a169; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #38a169; font-size: 16px;">🍳 Kitchen Request Fulfilled</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">Kitchen Request <strong>{{documentNumber}}</strong> has been successfully fulfilled and issued.</p>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">Otantik Restaurants System Notifications</p>
      </div>
    `,
    body_ar: `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; text-align: right; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #f0fff4; border-right: 4px solid #38a169; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #38a169; font-size: 16px;">🍳 صرف طلب المطبخ</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">تم صرف وتلبية طلب المطبخ رقم <strong>{{documentNumber}}</strong> بنجاح وتسليمه للمطبخ المعني.</p>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">إشعارات نظام مطاعم اوتانتك</p>
      </div>
    `,
    trigger_event: 'KITCHEN_REQUEST_POSTED',
    is_active: true,
    allowed_parameters: [
      {
        name: 'documentNumber',
        label_en: 'Document Number',
        label_ar: 'رقم المستند',
        sample_value: 'KR-2026-0001',
      },
    ],
  },
  {
    id: 'tmpl-grn-posted',
    code: 'GRN_POSTED',
    subject_ar: 'ترحيل إشعار استلام البضائع: {{documentNumber}}',
    subject_en: 'GRN Posted - Stock Updated: {{documentNumber}}',
    body_en: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #f0fff4; border-left: 4px solid #38a169; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #38a169; font-size: 16px;">📥 Goods Received Note Posted</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">Goods Received Note <strong>{{documentNumber}}</strong> has been posted and physical stock levels have been updated.</p>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">Otantik Restaurants Inventory Management</p>
      </div>
    `,
    body_ar: `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; text-align: right; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #f0fff4; border-right: 4px solid #38a169; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #38a169; font-size: 16px;">📥 ترحيل استلام البضائع</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">تم ترحيل إشعار استلام البضائع رقم <strong>{{documentNumber}}</strong> وتحديث كميات المخزون الفعلي بالمستودع.</p>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">إدارة المخزون لمطاعم اوتانتك</p>
      </div>
    `,
    trigger_event: 'GRN_POSTED',
    is_active: true,
    allowed_parameters: [
      {
        name: 'documentNumber',
        label_en: 'Document Number',
        label_ar: 'رقم المستند',
        sample_value: 'GRN-2026-0001',
      },
    ],
  },
  {
    id: 'tmpl-expiry-warning-alert',
    code: 'EXPIRY_WARNING_ALERT',
    subject_ar: 'تنبيه اقتراب انتهاء صلاحية شحنة: {{lotNumber}}',
    subject_en: 'Lot Expiry Warning (30 Days): {{lotNumber}}',
    body_en: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #fffaf0; border-left: 4px solid #dd6b20; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #dd6b20; font-size: 16px;">⚠️ Expiry Warning (30 Days)</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">Warning: The expiry date is approaching within 30 days for lot <strong>{{lotNumber}}</strong> of item <strong>{{itemName}}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">Warehouse:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{warehouseName}}</td>
          </tr>
        </table>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">Please take action to consume or write off this batch.</p>
      </div>
    `,
    body_ar: `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; text-align: right; color: #2d3748; margin: 0 auto;">
        <div style="background-color: #fffaf0; border-right: 4px solid #dd6b20; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #dd6b20; font-size: 16px;">⚠️ تنبيه اقتراب تاريخ الصلاحية (٣٠ يوماً)</strong>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">تنبيه: اقترب تاريخ انتهاء الصلاحية خلال ٣٠ يوماً للشحنة رقم <strong>{{lotNumber}}</strong> للصنف <strong>{{itemName}}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; text-align: right;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">المستودع:</td>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; font-size: 14px; color: #2d3748;">{{warehouseName}}</td>
          </tr>
        </table>
        <p style="margin-top: 25px; color: #a0aec0; font-size: 12px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center;">يرجى اتخاذ إجراء فوري لاستهلاك أو شطب هذه الشحنة.</p>
      </div>
    `,
    trigger_event: 'EXPIRY_WARNING_ALERT',
    is_active: true,
    allowed_parameters: [
      {
        name: 'lotNumber',
        label_en: 'Lot Number',
        label_ar: 'رقم التشغيلة',
        sample_value: 'LOT-12345',
      },
      {
        name: 'itemName',
        label_en: 'Item Name',
        label_ar: 'اسم الصنف',
        sample_value: 'Fresh Milk',
      },
      {
        name: 'warehouseName',
        label_en: 'Warehouse Name',
        label_ar: 'اسم المستودع',
        sample_value: 'Main Store',
      },
    ],
  },
];
