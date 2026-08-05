'use client';

import { useState, useMemo } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { TriggerEvent, EntityField } from '@/types/notifications';
import { 
 ArrowLeft,
 ArrowRight,
 Sparkles,
 Plus,
 Trash2,
 Lock,
 Check,
 AlertCircle,
 Search,
 Database,
 Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useTriggerEvents, useParameterRegistry } from '@/features/notifications/hooks/useNotificationTemplates';

const TEMPLATE_CODE_OPTIONS = [
  { value: 'LOW_STOCK_ALERT', labelEn: 'Low Stock Alert', labelAr: 'تنبيه نقص المخزون' },
  { value: 'EXPIRY_WARNING_ALERT', labelEn: 'Expiry Warning Alert', labelAr: 'تحذير اقتراب انتهاء الصلاحية' },
  { value: 'ADJUSTMENT_POSTED', labelEn: 'Stock Adjustment Posted', labelAr: 'ترحيل تسوية مخزنية' },
  { value: 'STOCKTAKE_POSTED', labelEn: 'Stocktake Finalized', labelAr: 'اعتماد جرد مخزني' },
  { value: 'TRANSFER_SHIPPED', labelEn: 'Warehouse Transfer Dispatched', labelAr: 'شحن تحويل مخزني' },
  { value: 'TRANSFER_RECEIVED', labelEn: 'Warehouse Transfer Received', labelAr: 'استلام تحويل مخزني' },
  { value: 'PR_APPROVED', labelEn: 'Purchase Request Approved', labelAr: 'اعتماد طلب شراء' },
  { value: 'PR_REJECTED', labelEn: 'Purchase Request Rejected', labelAr: 'رفض طلب شراء' },
  { value: 'PO_PENDING_APPROVAL', labelEn: 'PO Pending Approval', labelAr: 'أمر شراء بانتظار الاعتماد' },
  { value: 'PO_APPROVED', labelEn: 'Purchase Order Approved', labelAr: 'اعتماد أمر شراء' },
  { value: 'KITCHEN_REQUEST_SUBMITTED', labelEn: 'Kitchen Request Submitted', labelAr: 'رفع طلب مطبخ' },
  { value: 'KITCHEN_REQUEST_POSTED', labelEn: 'Kitchen Request Posted', labelAr: 'صرف طلب مطبخ' },
  { value: 'GRN_POSTED', labelEn: 'Goods Received Note Posted', labelAr: 'اعتماد سند استلام بضاعة' },
];

const PRESET_SAMPLES: Record<string, { subjectAr: string; bodyAr: string; subjectEn: string; bodyEn: string }> = {
  LOW_STOCK_ALERT: {
    subjectAr: 'تنبيه نقص المخزون: {{item_name}} ({{item_sku}})',
    bodyAr: 'وصل الصنف {{item_name}} (رمز: {{item_sku}}) إلى مستوى منخفض بالمخزون في مستودع {{item_warehouse}}. الكمية المتبقية حالياً هي {{item_currentStock}}.',
    subjectEn: 'Low Stock Alert: {{item_name}} ({{item_sku}})',
    bodyEn: 'Item {{item_name}} (SKU: {{item_sku}}) has reached low stock level in {{item_warehouse}}. Current stock: {{item_currentStock}}.',
  },
  EXPIRY_WARNING_ALERT: {
    subjectAr: 'تحذير قرب انتهاء صلاحية: {{item_name}}',
    bodyAr: 'الدفعة رقم {{lot_lotNumber}} للصنف {{item_name}} في مستودع {{item_warehouse}} تقترب من تاريخ انتهاء الصلاحية بتاريخ {{lot_expiryDate}}. الكمية المتبقية: {{lot_qtyOnHand}}.',
    subjectEn: 'Expiry Warning: {{item_name}}',
    bodyEn: 'Lot {{lot_lotNumber}} for item {{item_name}} in {{item_warehouse}} is expiring on {{lot_expiryDate}}. Remaining quantity: {{lot_qtyOnHand}}.',
  },
  PR_APPROVED: {
    subjectAr: 'تمت الموافقة على طلب الشراء رقم {{purchaserequest_documentNumber}}',
    bodyAr: 'تمت الموافقة الرسمية على طلب الشراء رقم {{purchaserequest_documentNumber}} للمستودع {{purchaserequest_warehouseName}} بواسطة {{purchaserequest_userName}}. يمكنك المتابعة في تحويل الطلب إلى أمر شراء.',
    subjectEn: 'Purchase Request Approved: {{purchaserequest_documentNumber}}',
    bodyEn: 'Purchase request {{purchaserequest_documentNumber}} for warehouse {{purchaserequest_warehouseName}} has been officially approved by {{purchaserequest_userName}}.',
  },
  PR_REJECTED: {
    subjectAr: 'تم رفض طلب الشراء رقم {{purchaserequest_documentNumber}}',
    bodyAr: 'تم رفض طلب الشراء رقم {{purchaserequest_documentNumber}} للمستودع {{purchaserequest_warehouseName}} بواسطة {{purchaserequest_userName}}. يُرجى مراجعة تفاصيل الطلب والتعديل عليه.',
    subjectEn: 'Purchase Request Rejected: {{purchaserequest_documentNumber}}',
    bodyEn: 'Purchase request {{purchaserequest_documentNumber}} for warehouse {{purchaserequest_warehouseName}} has been rejected by {{purchaserequest_userName}}.',
  },
  PO_PENDING_APPROVAL: {
    subjectAr: 'أمر شراء بانتظار الاعتماد رقم {{purchaseorder_poNumber}}',
    bodyAr: 'أمر الشراء رقم {{purchaseorder_poNumber}} الموجه للمورد {{purchaseorder_supplierName}} بقيمة {{purchaseorder_totalAmount}} بانتظار موافقة الإدارة. الحالة الحالية: {{purchaseorder_status}}.',
    subjectEn: 'PO Pending Approval: {{purchaseorder_poNumber}}',
    bodyEn: 'Purchase Order {{purchaseorder_poNumber}} for {{purchaseorder_supplierName}} with total amount {{purchaseorder_totalAmount}} is pending approval. Status: {{purchaseorder_status}}.',
  },
  PO_APPROVED: {
    subjectAr: 'تمت الموافقة على أمر الشراء رقم {{purchaseorder_poNumber}}',
    bodyAr: 'تمت الموافقة على أمر الشراء رقم {{purchaseorder_poNumber}} الموجه للمورد {{purchaseorder_supplierName}} بقيمة إجمالية {{purchaseorder_totalAmount}}. تم إرسال النسخة للمورد.',
    subjectEn: 'Purchase Order Approved: {{purchaseorder_poNumber}}',
    bodyEn: 'Purchase Order {{purchaseorder_poNumber}} issued to {{purchaseorder_supplierName}} with total amount {{purchaseorder_totalAmount}} has been approved.',
  },
  GRN_POSTED: {
    subjectAr: 'تم ترحيل سند استلام بضاعة رقم {{goodsreceivednote_grnNumber}}',
    bodyAr: 'تم اعتماد وتسليم البضاعة بسند رقم {{goodsreceivednote_grnNumber}} في مستودع {{goodsreceivednote_warehouseName}} الخاص بأمر الشراء {{goodsreceivednote_poNumber}}. تمت تحديث الكميات في المستودع بنجاح.',
    subjectEn: 'Goods Received Note Posted: {{goodsreceivednote_grnNumber}}',
    bodyEn: 'Goods receipt {{goodsreceivednote_grnNumber}} for warehouse {{goodsreceivednote_warehouseName}} linked to PO {{goodsreceivednote_poNumber}} has been posted.',
  },
  STOCKTAKE_POSTED: {
    subjectAr: 'تم اعتماد نتائج الجرد المخزني رقم {{stocktake_sessionNumber}}',
    bodyAr: 'تم اعتماد نتائج الجرد النهائي للجلسة رقم {{stocktake_sessionNumber}} بالمستودع {{stocktake_warehouseName}}. بلغ إجمالي قيمة التباين {{stocktake_totalVarianceValue}}.',
    subjectEn: 'Stocktake Session Finalized: {{stocktake_sessionNumber}}',
    bodyEn: 'Stocktake session {{stocktake_sessionNumber}} for warehouse {{stocktake_warehouseName}} has been finalized. Total variance value is {{stocktake_totalVarianceValue}}.',
  },
  TRANSFER_SHIPPED: {
    subjectAr: 'تم شحن التحويل المخزني رقم {{transfer_transferNumber}}',
    bodyAr: 'تم شحن التحويل المخزني رقم {{transfer_transferNumber}} من مستودع {{transfer_fromWarehouse}} إلى مستودع {{transfer_toWarehouse}}. يُرجى الاستعداد للاستلام والتأكيد.',
    subjectEn: 'Transfer Dispatched: {{transfer_transferNumber}}',
    bodyEn: 'Transfer {{transfer_transferNumber}} from {{transfer_fromWarehouse}} to {{transfer_toWarehouse}} has been dispatched.',
  },
  TRANSFER_RECEIVED: {
    subjectAr: 'تم استلام التحويل المخزني رقم {{transfer_transferNumber}}',
    bodyAr: 'تم استلام وتأكيد التحويل المخزني رقم {{transfer_transferNumber}} في مستودع {{transfer_toWarehouse}} القادم من مستودع {{transfer_fromWarehouse}}.',
    subjectEn: 'Transfer Received: {{transfer_transferNumber}}',
    bodyEn: 'Transfer {{transfer_transferNumber}} has been successfully received at {{transfer_toWarehouse}} from {{transfer_fromWarehouse}}.',
  },
  KITCHEN_REQUEST_SUBMITTED: {
    subjectAr: 'تم رفع طلب مطبخ جديد رقم {{kitchenrequest_documentNumber}}',
    bodyAr: 'تم رفع طلب مطبخ جديد برقم {{kitchenrequest_documentNumber}} للمستودع {{kitchenrequest_warehouseName}} بواسطة {{kitchenrequest_userName}}.',
    subjectEn: 'Kitchen Request Submitted: {{kitchenrequest_documentNumber}}',
    bodyEn: 'Kitchen request {{kitchenrequest_documentNumber}} for warehouse {{kitchenrequest_warehouseName}} submitted by {{kitchenrequest_userName}}.',
  },
  KITCHEN_REQUEST_POSTED: {
    subjectAr: 'تم صرف طلب المطبخ رقم {{kitchenrequest_documentNumber}}',
    bodyAr: 'تمت الموافقة وصرف طلب المطبخ رقم {{kitchenrequest_documentNumber}} من مستودع {{kitchenrequest_warehouseName}} بنجاح.',
    subjectEn: 'Kitchen Request Issued: {{kitchenrequest_documentNumber}}',
    bodyEn: 'Kitchen request {{kitchenrequest_documentNumber}} from warehouse {{kitchenrequest_warehouseName}} has been issued.',
  },
};

export function TemplateCreateClient({ locale }: { locale: string }) {
 const t = useTranslations('notifications');
 const t_common = useTranslations('common');
 const router = useRouter();
 const qc = useQueryClient();
 const { playSound } = useAudioFeedback();
 const { data: triggerEventsData, isLoading: eventsLoading } = useTriggerEvents();
 const { data: parameterRegistry, isLoading: registryLoading } = useParameterRegistry();

 const triggerEvents = useMemo(() => (triggerEventsData as { data?: Array<TriggerEvent> })?.data || (triggerEventsData as Array<TriggerEvent>) || [], [triggerEventsData]);

 const getSuggestedParams = (eventCode: string) => {
  const event = triggerEvents.find((e: TriggerEvent) => e.code === eventCode);
  if (!event || !parameterRegistry) return [];
  const entityFields = (parameterRegistry as Record<string, Array<EntityField>>)[event.entityType];
  if (!entityFields) return [];
  const result: Array<{ name: string; labelAr: string; labelEn: string; sampleValue: string; entity: string; fieldPath: string }> = [];
  event.suggestedFields.forEach((fieldName: string) => {
   const match = entityFields.find((f: EntityField) => f.field === fieldName);
   if (match) {
    result.push({
     name: `${match.entity.toLowerCase()}_${match.field}`,
     labelAr: match.labelAr,
     labelEn: match.labelEn,
     sampleValue: match.sampleValue,
     entity: match.entity,
     fieldPath: match.field,
    });
   }
  });
  return result;
 };

 const [step, setStep] = useState(1);
  const [focusedField, setFocusedField] = useState<'subjectAr' | 'bodyAr' | 'subjectEn' | 'bodyEn'>('bodyAr');
  const [template, setTemplate] = useState({
   code: '',
   triggerEvent: '',
   subjectAr: '',
   subjectEn: '',
   bodyAr: '',
   bodyEn: '',
   allowedParameters: [] as Array<{ name: string; labelAr: string; labelEn: string; sampleValue: string; entity?: string; fieldPath?: string }>,
   isActive: true,
  });

  const [paramForm, setParamForm] = useState({
   name: '',
   labelAr: '',
   labelEn: '',
   sampleValue: '',
  });

  const [entitySearch, setEntitySearch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
   mutationFn: (body: unknown) => apiClient.post('/notifications/templates', z.unknown(), body),
   onSuccess: (data: unknown) => {
    playSound('success');
    qc.invalidateQueries({ queryKey: ['notifications/templates'] });
    // Redirect to the newly created template detail page
    const createdId = (data as { id?: string })?.id || 'tmpl-1';
    router.push(`/communications/notifications/templates/${createdId}`);
   },
   onError: (err: unknown) => {
    playSound('error');
    setError((err as { message?: string })?.message || 'Failed to create template');
   }
  });

  const loadPresetContent = (codeValue: string) => {
   const preset = PRESET_SAMPLES[codeValue];
   if (preset) {
    setTemplate(prev => ({
     ...prev,
     subjectAr: preset.subjectAr,
     bodyAr: preset.bodyAr,
     subjectEn: preset.subjectEn,
     bodyEn: preset.bodyEn,
    }));
   }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
   const val = e.target.value;
   const suggested = getSuggestedParams(val);
   const preset = PRESET_SAMPLES[val];
   setTemplate(prev => ({
    ...prev,
    code: val,
    triggerEvent: val,
    allowedParameters: [...suggested],
    ...(preset ? {
      subjectAr: preset.subjectAr,
      bodyAr: preset.bodyAr,
      subjectEn: preset.subjectEn,
      bodyEn: preset.bodyEn,
    } : {})
   }));
   setSelectedEntity(null);
   setError(null);
  };

  const insertTokenToField = (tokenName: string) => {
   const tokenStr = `{{${tokenName}}}`;
   setTemplate(prev => ({
    ...prev,
    [focusedField]: prev[focusedField] ? `${prev[focusedField]} ${tokenStr}` : tokenStr
   }));
  };

  const handleTriggerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
   const val = e.target.value;
   const suggested = getSuggestedParams(val);
   setTemplate(prev => ({
    ...prev,
    triggerEvent: val,
    allowedParameters: [...suggested]
   }));
   setSelectedEntity(null);
  };

 const addRegistryField = (field: EntityField) => {
  const paramName = `${field.entity.toLowerCase()}_${field.field}`;
  if (template.allowedParameters.some(p => p.name === paramName)) return;
  setTemplate(prev => ({
   ...prev,
   allowedParameters: [
    ...prev.allowedParameters,
    {
     name: paramName,
     labelAr: field.labelAr,
     labelEn: field.labelEn,
     sampleValue: field.sampleValue,
     entity: field.entity,
     fieldPath: field.field,
    }
   ]
  }));
  playSound('click');
 };

 const addCustomParam = () => {
  if (!paramForm.name || !paramForm.labelEn || !paramForm.sampleValue) return;
  const nameSanitized = paramForm.name.toLowerCase().replace(/[^a-z0-9_]/g, '');

  if (template.allowedParameters.some(p => p.name === nameSanitized)) {
   setError('Parameter name already exists');
   return;
  }

  setTemplate(prev => ({
   ...prev,
   allowedParameters: [
    ...prev.allowedParameters,
    {
     name: nameSanitized,
     labelAr: paramForm.labelAr || paramForm.labelEn,
     labelEn: paramForm.labelEn,
     sampleValue: paramForm.sampleValue
    }
   ]
  }));
  setParamForm({ name: '', labelAr: '', labelEn: '', sampleValue: '' });
  setError(null);
 };

 const removeParam = (name: string) => {
  setTemplate(prev => ({
   ...prev,
   allowedParameters: prev.allowedParameters.filter(p => p.name !== name)
  }));
 };

 const executeCreate = () => {
  if (!template.code || !template.triggerEvent) {
   setError('Please fill in the template code');
   return;
  }
  createMutation.mutate(template);
 };

 return (
  <div className="min-w-0 gap-6 flex-1 max-w-4xl space-y-8 mx-auto relative flex-col flex w-full">
   <div className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2" />

   {/* Header section */}
   <div className="space-y-6">
    <button
     onClick={() => router.push('/communications/notifications/templates')}
     className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-operational-cyan transition-all"
    >
     <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
     {t_common('actions.back') || 'الرجوع للقوالب'}
    </button>
    
    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-6 gap-4">
     <div className="space-y-1">
      <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
       {locale === 'ar' ? 'إنشاء قالب إشعار جديد' : 'CREATE NOTIFICATION TEMPLATE'}
      </h1>
      <p className="text-xs text-muted-foreground/70 font-medium flex items-center gap-2 mt-1">
       <span className="w-2 h-2 rounded-full bg-operational-cyan animate-pulse" />
       {locale === 'ar'
        ? 'معالج تسجيل وإعداد إشعارات النظام التلقائية'
        : 'Dynamic Notification Registration Pipeline'}
      </p>
     </div>
     
     {/* Stepper Indicator */}
     <div className="flex items-center gap-2 bg-card border border-border p-1.5 rounded-none">
      <div className={`px-3 py-1.5 text-xs font-bold transition-all ${step === 1 ? 'bg-operational-cyan/20 text-operational-cyan border border-operational-cyan/40' : 'text-muted-foreground/50'}`}>
       {locale === 'ar' ? '1. اختيار الحدث' : '1. Select Event'}
      </div>
      <div className={`px-3 py-1.5 text-xs font-bold transition-all ${step === 2 ? 'bg-operational-cyan/20 text-operational-cyan border border-operational-cyan/40' : 'text-muted-foreground/50'}`}>
       {locale === 'ar' ? '2. تحديد المتغيرات' : '2. Tokens'}
      </div>
      <div className={`px-3 py-1.5 text-xs font-bold transition-all ${step === 3 ? 'bg-operational-cyan/20 text-operational-cyan border border-operational-cyan/40' : 'text-muted-foreground/50'}`}>
       {locale === 'ar' ? '3. صياغة النص' : '3. Content'}
      </div>
     </div>
    </div>
   </div>

   {error && (
    <div className="p-4 rounded-none bg-neutral-900/50 dark:bg-black/50 border border-status-error/20 flex items-start gap-3 text-status-error text-xs font-bold leading-normal">
     <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
     <span>{error}</span>
    </div>
   )}

   {/* Wizard steps content */}
   <div className="min-h-[350px]">
    <AnimatePresence mode="wait">
     {step === 1 && (
      <motion.div
       key="step-1"
       initial={{ opacity: 0, x: -10 }}
       animate={{ opacity: 1, x: 0 }}
       exit={{ opacity: 0, x: 10 }}
       transition={{ duration: 0.15 }}
       className="space-y-6"
      >
        {/* Step 1 Instructions Card */}
        <div className="p-5 bg-card border border-border rounded-none space-y-2">
         <div className="flex items-center gap-2 text-operational-cyan font-bold text-sm">
          <Sparkles className="w-4 h-4" />
          <span>المرحلة 1 من 3: اختيار الحدث التشغيلي في النظام (Trigger Event)</span>
         </div>
         <p className="text-xs text-muted-foreground leading-relaxed">
          اختر نوع العملية أو الحدث المخزني الذي سيقوم السيرفر بتفعيل وتوليد هذا الإشعار تلقائياً فور حدوثه (مثل: اعتماد طلب شراء، تنبيه نقص المخزون، أو ترحيل سند استلام بضاعة). سيقوم النظام آلياً باقتراح حقول البيانات المناسبة لهذا الحدث وتعبئة نموذج استرشادي جاهز.
         </p>
        </div>

        <div className="grid gap-4 p-5 bg-card border border-border rounded-none">
         <Label htmlFor="code" className="text-xs font-bold text-foreground/90">
          {locale === 'ar' ? 'رمز القالب / الحدث التشغيلي:' : 'TEMPLATE CODE / TRIGGER EVENT:'}
         </Label>
         <div className="relative">
          <select
           id="code"
           value={template.code}
           onChange={handleCodeChange}
           className="w-full h-14 bg-card border border-border dark:border-white/10 rounded-none px-5 focus:outline-none focus:ring-1 focus:ring-operational-cyan text-sm font-semibold transition-all appearance-none cursor-pointer text-foreground"
          >
           <option value="" disabled>
            {locale === 'ar' ? 'اختر رمز القالب والحدث المطلوب...' : 'Select template code...'}
           </option>
           {TEMPLATE_CODE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
             {locale === 'ar' ? opt.labelAr : opt.labelEn} ({opt.value})
            </option>
           ))}
          </select>
          <div className="absolute end-5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/45">
           ▼
          </div>
         </div>
         {eventsLoading ? (
          <p className="text-[9px] text-muted-foreground/45 font-medium mt-1.5 ms-1 flex items-center gap-1.5">
           <Loader2 className="w-3 h-3 animate-spin text-operational-cyan" />
           جاري تحميل بيانات الأحداث...
          </p>
         ) : template.code && (() => {
          const evt = triggerEvents.find((e: TriggerEvent) => e.code === template.code);
          return evt ? (
           <p className="text-xs text-operational-cyan font-medium mt-1.5 ms-1">
            ✓ {evt.description} — Kinet: <span className="font-mono text-foreground font-bold">{evt.entityType}</span>
           </p>
          ) : null;
         })()}
        </div>
      </motion.div>
     )}

     {step === 2 && (
      <motion.div
       key="step-2"
       initial={{ opacity: 0, x: -10 }}
       animate={{ opacity: 1, x: 0 }}
       exit={{ opacity: 0, x: 10 }}
       transition={{ duration: 0.15 }}
       className="space-y-6"
      >
       {/* Step 2 Instructions Card */}
       <div className="p-5 bg-card border border-border rounded-none space-y-2">
        <div className="flex items-center gap-2 text-operational-cyan font-bold text-sm">
         <Database className="w-4 h-4" />
         <span>المرحلة 2 من 3: تحديد وتخصيص متغيرات الحقول (Allowed Parameters)</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
         المتغيرات هي الكلمات المفتاحية الديناميكية (مثل اسم الصنف <code className="text-operational-cyan font-mono">{`{{item_name}}`}</code> أو رقم الطلب <code className="text-operational-cyan font-mono">{`{{po_number}}`}</code>) التي يستبدلها النظام تلقائياً بالبيانات الحقيقية عند إرسال الإشعار. يمكنك إضافة حقول أخرى من متصفح قواعد البيانات (DB Entity Browser) بالأسفل أو إضافة متغير مخصص يدويًا.
        </p>
       </div>
       {/* Current Parameters List */}
       <div className="space-y-3">
        <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 block">
         ALLOWED PARAMETERS FOR TRIGGER: {template.triggerEvent}
         <span className="ms-2 text-[9px] font-mono text-muted-foreground/45 bg-card/5 px-1.5 py-0.5">
          {template.allowedParameters.length} TOKENS
         </span>
        </Label>
        
        <div className="space-y-2 max-h-[200px] overflow-y-auto pe-1">
         {template.allowedParameters.length === 0 ? (
          <div className="py-8 border border-dashed border-white/10 rounded-none flex flex-col items-center justify-center text-center text-muted-foreground/40 gap-2 min-w-0">
           <p className="text-xs italic font-medium">No parameters defined yet. Add from the entity browser below or create custom tokens.</p>
          </div>
         ) : (
          template.allowedParameters.map((param) => {
           const isEntityBound = !!(param.entity && param.fieldPath);
           return (
            <div 
             key={param.name}
             className="flex items-center justify-between p-3 bg-card border border-border dark:border-white/10 rounded-none"
            >
             <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-[10px] font-bold text-operational-cyan px-2 py-0.5 rounded-none bg-operational-cyan/10 border border-operational-cyan/20 shrink-0">
               {"{{"}{param.name}{"}}"}
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
               <span className="text-[10px] font-bold text-foreground/80 truncate">
                {param.labelEn} / {param.labelAr}
               </span>
               <span className="text-[9px] font-mono text-muted-foreground/45 truncate">
                Sample: {param.sampleValue}
                {isEntityBound && (
                 <span className="ms-2 text-[8px] uppercase tracking-wider text-operational-cyan/60">
                  · {param.entity}.{param.fieldPath}
                 </span>
                )}
               </span>
              </div>
             </div>

             {isEntityBound ? (
              <div className="flex items-center gap-1 text-[8px] font-black uppercase text-muted-foreground/35 bg-card/5 border border-white/5 rounded-none px-1.5 py-0.5 tracking-wider shrink-0">
               <Database className="w-2.5 h-2.5 stroke-[2.5px]" />
               DB
              </div>
             ) : (
              <button
               type="button"
               onClick={() => removeParam(param.name)}
               className="p-1.5 rounded-none text-status-error/60 hover:text-status-error hover:bg-status-error/15 transition-colors shrink-0"
              >
               <Trash2 className="w-3.5 h-3.5" />
              </button>
             )}
            </div>
           );
          })
         )}
        </div>
       </div>

       {/* Entity Field Browser Panel */}
       {!registryLoading && parameterRegistry && (
        <div className="border border-border dark:border-white/10 rounded-none bg-card overflow-hidden">
         <div className="p-3 border-b border-border dark:border-white/10 flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1.5">
           <Database className="w-3.5 h-3.5" /> ENTITY FIELD BROWSER
          </div>
          <div className="relative w-48">
           <Search className="w-3 h-3 absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
           <Input
             type="text"
             value={entitySearch}
             onChange={(e) => setEntitySearch(e.target.value)}
             placeholder="Search fields..."
             className="w-full h-7 text-[10px] bg-card border border-border shadow-sm rounded-none ps-7 pe-2 outline-none focus:border-operational-cyan/40 text-foreground placeholder:text-muted-foreground/30 font-mono"
           />
          </div>
         </div>
         <div className="flex">
          {/* Entity Sidebar */}
          <div className="w-28 shrink-0 border-r border-white/10 max-h-[250px] overflow-y-auto">
           {Object.keys(parameterRegistry as Record<string, unknown>).map((entity) => {
            const entityIcon = entity === 'Item' || entity === 'Lot' ? '📦' : entity === 'User' ? '👤' : entity === 'Order' || entity === 'Transfer' ? '📋' : entity === 'Adjustment' ? '⚖️' : entity === 'Branch' ? '📍' : '📊';
            return (
             <button
              key={entity}
              type="button"
              onClick={() => setSelectedEntity(selectedEntity === entity ? null : entity)}
              className={`w-full text-start px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${
               selectedEntity === entity
                ? 'bg-operational-cyan/10 text-operational-cyan border-l-2 border-operational-cyan'
                : 'text-muted-foreground/60 hover:bg-card border border-border shadow-sm hover:text-foreground border-l-2 border-transparent'
              }`}
             >
              <span className="me-1">{entityIcon}</span>
              {entity}
             </button>
            );
           })}
          </div>
          {/* Fields List */}
          <div className="flex-1 max-h-[250px] overflow-y-auto p-2">
           {selectedEntity ? (
            <div className="space-y-1">
             {(parameterRegistry as Record<string, Array<EntityField>>)[selectedEntity]
              .filter((f) =>
               !entitySearch ||
               f.field.toLowerCase().includes(entitySearch.toLowerCase()) ||
               f.labelEn.toLowerCase().includes(entitySearch.toLowerCase()) ||
               f.labelAr.includes(entitySearch)
              )
              .map((field) => {
               const paramName = `${field.entity.toLowerCase()}_${field.field}`;
               const alreadyAdded = template.allowedParameters.some(
                p => p.name === paramName
               );
               return (
                <button
                 key={field.field}
                 type="button"
                 disabled={alreadyAdded}
                 onClick={() => addRegistryField(field)}
                 className={`w-full text-start px-3 py-2 rounded-none text-[10px] transition-all flex items-center justify-between gap-2 ${
                  alreadyAdded
                   ? 'bg-card border border-border shadow-sm text-muted-foreground/30 cursor-not-allowed'
                   : 'hover:bg-card border border-border shadow-sm text-foreground/80 hover:text-operational-cyan'
                 }`}
                >
                 <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-[9px]">
                   {field.field}
                  </span>
                  <span className="text-muted-foreground/40 truncate">
                   {locale === 'ar' ? field.labelAr : field.labelEn}
                  </span>
                 </div>
                 <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[7px] uppercase font-black tracking-widest px-1 py-0.5 rounded-none ${
                   field.type === 'string' ? 'bg-muted/50 text-foreground/70' :
                   field.type === 'number' ? 'bg-amber-500/10 text-amber-500/70' :
                   field.type === 'date' ? 'bg-sky-500/10 text-sky-500/70' :
                   'bg-rose-500/10 text-rose-500/70'
                  }`}>
                   {field.type}
                  </span>
                  {alreadyAdded ? (
                   <Check className="w-3 h-3 text-foreground/50" />
                  ) : (
                   <Plus className="w-3 h-3 text-muted-foreground/40" />
                  )}
                 </div>
                </button>
               );
              })}
             {(parameterRegistry as Record<string, Array<{ field: string }>>)[selectedEntity].filter((f) =>
              !entitySearch ||
              f.field.toLowerCase().includes(entitySearch.toLowerCase())
             ).length === 0 && (
              <p className="text-[10px] text-muted-foreground/40 italic p-3 text-center">
               No fields match your search.
              </p>
             )}
            </div>
           ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-2 py-8 min-w-0">
              <Database className="w-6 h-6" />
             <p className="text-[10px] italic font-medium">Select an entity on the left to browse its fields.</p>
            </div>
           )}
          </div>
         </div>
        </div>
       )}

       {/* Add custom parameter subform */}
       <div className="p-4 border border-border dark:border-white/10 rounded-none bg-card space-y-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1.5">
         <Plus className="w-3.5 h-3.5" /> ADD CUSTOM TOKEN VARIABLE
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
         <div className="space-y-1">
          <Label htmlFor="p_name" className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
           Token Name
          </Label>
          <Input
           id="p_name"
           value={paramForm.name}
           onChange={(e) => setParamForm(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
           placeholder="e.g. order_id"
           className="h-9 text-[11px] font-mono rounded-none bg-card border border-border dark:border-white/10 px-3"
          />
         </div>
         <div className="space-y-1">
          <Label htmlFor="p_sample" className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
           Sample Value
          </Label>
          <Input
           id="p_sample"
           value={paramForm.sampleValue}
           onChange={(e) => setParamForm(prev => ({ ...prev, sampleValue: e.target.value }))}
           placeholder="e.g. ORD-1002"
           className="h-9 text-[11px] rounded-none bg-surface-container border border-white/10 px-3"
          />
         </div>
         <div className="space-y-1">
          <Label htmlFor="p_en" className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
           English Label
          </Label>
          <Input
           id="p_en"
           value={paramForm.labelEn}
           onChange={(e) => setParamForm(prev => ({ ...prev, labelEn: e.target.value }))}
           placeholder="e.g. Order ID"
           className="h-9 text-[11px] rounded-none bg-surface-container border border-white/10 px-3"
          />
         </div>
         <div className="space-y-1">
          <Label htmlFor="p_ar" className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
           Arabic Label
          </Label>
          <Input
           id="p_ar"
           value={paramForm.labelAr}
           onChange={(e) => setParamForm(prev => ({ ...prev, labelAr: e.target.value }))}
           placeholder="e.g. رقم الطلب"
           className="h-9 text-[11px] rounded-none bg-surface-container border border-white/10 px-3"
          />
         </div>
        </div>
        <Button
         type="button"
         onClick={addCustomParam}
         disabled={!paramForm.name || !paramForm.labelEn || !paramForm.sampleValue}
         className="w-full h-9 border border-white/10 hover:border-operational-cyan/35 bg-card border border-border shadow-sm rounded-none font-bold uppercase text-[9px] tracking-widest transition-all"
        >
         Register Variable to List
        </Button>
       </div>
      </motion.div>
     )}

     {step === 3 && (
      <motion.div
       key="step-3"
       initial={{ opacity: 0, x: -10 }}
       animate={{ opacity: 1, x: 0 }}
       exit={{ opacity: 0, x: 10 }}
       transition={{ duration: 0.15 }}
       className="space-y-6"
      >
       {/* Step 3 Instructions Card */}
       <div className="p-5 bg-card border border-border rounded-none space-y-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
         <div className="flex items-center gap-2 text-operational-cyan font-bold text-sm">
          <Sparkles className="w-4 h-4" />
          <span>المرحلة 3 من 3: صياغة موضوع ونص الرسالة والمعاينة الحية</span>
         </div>
         {PRESET_SAMPLES[template.code] && (
          <Button
           type="button"
           onClick={() => loadPresetContent(template.code)}
           className="h-8 px-3 text-xs font-bold bg-operational-cyan/15 text-operational-cyan border border-operational-cyan/30 hover:bg-operational-cyan/25 shrink-0"
          >
           {locale === 'ar' ? '⚡ تحميل نموذج محتوى جاهز' : '⚡ Load Sample Content'}
          </Button>
         )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
         اكتب موضوع ونص الرسالة باللغتين العربية والإنجليزية. انقر على أي زر متغير من الشريط أدناه لإدراجه مباشرة في الحقل المحدد بمؤشر الكتابة بدون كتابة يدويّة، وراجع المعاينة الحية بالأسفل للتأكد من المظهر النهائي قبل الحفظ.
        </p>
       </div>

       {/* Clickable Available Parameter Chips Bar */}
       <div className="p-4 bg-card border border-border dark:border-white/10 rounded-none space-y-2">
        <div className="flex items-center justify-between">
         <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          {locale === 'ar' ? 'المتغيرات المتاحة لهذا القالب (انقر للإدراج):' : 'AVAILABLE TOKENS (CLICK TO INSERT):'}
         </span>
         <span className="text-[9px] font-mono text-operational-cyan">
          Focus: {focusedField}
         </span>
        </div>
        <div className="flex flex-wrap gap-2">
         {template.allowedParameters.length === 0 ? (
          <span className="text-[10px] text-muted-foreground/45 italic">
           {locale === 'ar' ? 'لا توجد متغيرات محددة لهذا القالب بعد.' : 'No tokens registered for this template.'}
          </span>
         ) : (
          template.allowedParameters.map((p) => (
           <button
            key={p.name}
            type="button"
            onClick={() => insertTokenToField(p.name)}
            title={`${p.labelEn} / ${p.labelAr} (Sample: ${p.sampleValue})`}
            className="font-mono text-xs font-bold text-operational-cyan bg-operational-cyan/10 hover:bg-operational-cyan/25 border border-operational-cyan/30 px-2.5 py-1 rounded-none transition-all cursor-pointer flex items-center gap-1"
           >
            <Plus className="w-3 h-3 stroke-[3px]" />
            {"{{"}{p.name}{"}}"}
           </button>
          ))
         )}
        </div>
       </div>

       {/* Arabic Content */}
       <div className="space-y-4 p-5 bg-surface-container border border-white/10 rounded-none">
        <span className="text-[10px] font-bold uppercase tracking-wider text-operational-cyan flex items-center gap-1.5">
         <span className="w-1.5 h-1.5 bg-operational-cyan" />
         ARABIC TEMPLATE CONTENT (RTL)
        </span>
        
        <div className="grid gap-2">
         <Label htmlFor="sub_ar" className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60">Subject (Arabic)</Label>
         <Input
          id="sub_ar"
          value={template.subjectAr}
          onFocus={() => setFocusedField('subjectAr')}
          onChange={(e) => setTemplate(prev => ({ ...prev, subjectAr: e.target.value }))}
          placeholder="تنبيه نقص المخزون: {{item_name}}"
          dir="rtl"
          className="h-11 text-xs rounded-none bg-surface-container border border-white/10 px-3"
         />
        </div>

        <div className="grid gap-2">
         <Label htmlFor="body_ar" className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60">Message Body (Arabic)</Label>
         <Textarea
          id="body_ar"
          value={template.bodyAr}
          onFocus={() => setFocusedField('bodyAr')}
          onChange={(e) => setTemplate(prev => ({ ...prev, bodyAr: e.target.value }))}
          placeholder="الصنف {{item_name}} وصل إلى كمية {{qty}}..."
          dir="rtl"
          className="w-full min-h-[160px] rounded-xl p-4 font-mono text-sm leading-relaxed tracking-wide transition-all resize-y outline-none focus:ring-1 focus:ring-brand-gold/50 bg-slate-50 border-slate-200 text-slate-800 shadow-inner dark:bg-[#0a0a0a] dark:border-white/10 dark:text-brand-gold/90 scrollbar-thin dark:scrollbar-thumb-white/10 scrollbar-thumb-slate-300"
         />
        </div>
       </div>

       {/* English Content */}
       <div className="space-y-4 p-5 bg-surface-container border border-white/10 rounded-none">
        <span className="text-[10px] font-bold uppercase tracking-wider text-operational-cyan flex items-center gap-1.5">
         <span className="w-1.5 h-1.5 bg-operational-cyan" />
         ENGLISH TEMPLATE CONTENT (LTR)
        </span>
        
        <div className="grid gap-2">
         <Label htmlFor="sub_en" className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60">Subject (English)</Label>
         <Input
          id="sub_en"
          value={template.subjectEn}
          onFocus={() => setFocusedField('subjectEn')}
          onChange={(e) => setTemplate(prev => ({ ...prev, subjectEn: e.target.value }))}
          placeholder="Low Stock Alert: {{item_name}}"
          dir="ltr"
          className="h-11 text-xs rounded-none bg-surface-container border border-white/10 px-3"
         />
        </div>

        <div className="grid gap-2">
         <Label htmlFor="body_en" className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60">Message Body (English)</Label>
         <Textarea
          id="body_en"
          value={template.bodyEn}
          onFocus={() => setFocusedField('bodyEn')}
          onChange={(e) => setTemplate(prev => ({ ...prev, bodyEn: e.target.value }))}
          placeholder="Item {{item_name}} reached low quantity of {{qty}}..."
          dir="ltr"
          className="w-full min-h-[160px] rounded-xl p-4 font-mono text-sm leading-relaxed tracking-wide transition-all resize-y outline-none focus:ring-1 focus:ring-brand-gold/50 bg-slate-50 border-slate-200 text-slate-800 shadow-inner dark:bg-[#0a0a0a] dark:border-white/10 dark:text-brand-gold/90 scrollbar-thin dark:scrollbar-thumb-white/10 scrollbar-thumb-slate-300"
         />
        </div>
       </div>

       {/* Live Interpolated Preview Box */}
       <div className="p-5 border border-border dark:border-white/10 rounded-none bg-card space-y-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-operational-cyan flex items-center justify-between">
         <span>LIVE INTERPOLATION PREVIEW (معاينة حية وتفاعلية)</span>
         <span className="text-[9px] text-muted-foreground/50 font-mono">Sample Rendering</span>
        </div>

        {/* Arabic Live Preview */}
        <div className="p-4 bg-muted/20 border border-border/60 rounded-none space-y-2 text-end" dir="rtl">
         <div className="text-xs font-bold text-foreground">
          {template.subjectAr
           ? template.subjectAr.replace(/\{\{([^}]+)\}\}/g, (_, name) => {
              const param = template.allowedParameters.find(p => p.name === name.trim());
              return param?.sampleValue || `[${name}]`;
             })
           : <span className="italic text-muted-foreground/40">موضوع الرسالة (عربي)...</span>}
         </div>
         <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {template.bodyAr
           ? template.bodyAr.replace(/\{\{([^}]+)\}\}/g, (_, name) => {
              const param = template.allowedParameters.find(p => p.name === name.trim());
              return param?.sampleValue || `[${name}]`;
             })
           : <span className="italic text-muted-foreground/40">محتوى نص الرسالة (عربي)...</span>}
         </div>
        </div>

        {/* English Live Preview */}
        <div className="p-4 bg-muted/20 border border-border/60 rounded-none space-y-2 text-start" dir="ltr">
         <div className="text-xs font-bold text-foreground">
          {template.subjectEn
           ? template.subjectEn.replace(/\{\{([^}]+)\}\}/g, (_, name) => {
              const param = template.allowedParameters.find(p => p.name === name.trim());
              return param?.sampleValue || `[${name}]`;
             })
           : <span className="italic text-muted-foreground/40">Subject (English)...</span>}
         </div>
         <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {template.bodyEn
           ? template.bodyEn.replace(/\{\{([^}]+)\}\}/g, (_, name) => {
              const param = template.allowedParameters.find(p => p.name === name.trim());
              return param?.sampleValue || `[${name}]`;
             })
           : <span className="italic text-muted-foreground/40">Body text (English)...</span>}
         </div>
        </div>
       </div>
      </motion.div>
     )}
    </AnimatePresence>
   </div>

   {/* Navigation Buttons */}
   <div className="flex items-center justify-between border-t border-white/10 pt-6">
    <div>
     {step > 1 && (
      <Button
       type="button"
       variant="ghost"
       onClick={() => setStep(prev => prev - 1)}
       className="h-12 px-6 border border-white/10 rounded-none text-[10px] font-bold uppercase tracking-widest gap-2 hover:bg-card/5"
      >
       <ArrowLeft className="w-3.5 h-3.5" />
       {t_common('actions.back') || 'Back'}
      </Button>
     )}
    </div>

    <div className="flex items-center gap-3">
     <Button
      type="button"
      variant="ghost"
      onClick={() => router.push('/communications/notifications/templates')}
      className="h-12 px-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground rounded-none"
     >
      {t_common('actions.cancel') || 'Cancel'}
     </Button>

     {step < 3 ? (
      <Button
       type="button"
       disabled={step === 1 && !template.code}
       onClick={() => setStep(prev => prev + 1)}
       className="h-12 px-6 bg-card/5 border border-white/10 hover:border-white/20 rounded-none text-[10px] font-bold uppercase tracking-widest gap-2 text-foreground"
      >
       Next Step
       <ArrowRight className="w-3.5 h-3.5" />
      </Button>
     ) : (
      <Button
       type="button"
       onClick={executeCreate}
       disabled={createMutation.isPending}
       className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
       {createMutation.isPending ? 'CREATING...' : 'CREATE TEMPLATE'}
       <Check className="w-4 h-4 stroke-[3px]" />
      </Button>
     )}
    </div>
   </div>
  </div>
 );
}
