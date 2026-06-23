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

  const handleCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
   const val = e.target.value;
   const suggested = getSuggestedParams(val);
   setTemplate(prev => ({
    ...prev,
    code: val,
    triggerEvent: val,
    allowedParameters: [...suggested]
   }));
   setSelectedEntity(null);
   setError(null);
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
   <div className="space-y-4">
    <button
     onClick={() => router.push('/communications/notifications/templates')}
     className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-operational-cyan transition-all"
    >
     <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
     {t_common('actions.back') || 'Back to templates'}
    </button>
    
    <div className="flex items-center justify-between border-b border-white/10 pb-6">
     <div className="space-y-1">
      <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
       CREATE TEMPLATE
      </h1>
      <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-[0.2em] mt-1.5 flex items-center gap-2">
       <span className="w-1.5 h-1.5 rounded-full bg-operational-cyan animate-pulse" />
       Dynamic Notification Registration Pipeline
      </p>
     </div>
     <div className="text-end font-mono text-3xl font-black text-muted-foreground/20">
      0{step} / 03
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
        <div className="grid gap-4">
         <Label htmlFor="code" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
          TEMPLATE CODE
         </Label>
         <div className="relative">
          <select
           id="code"
           value={template.code}
           onChange={handleCodeChange}
           className="w-full h-14 bg-card border border-border dark:border-white/10 rounded-none px-5 focus:outline-none focus:ring-1 focus:ring-operational-cyan text-sm font-semibold transition-all appearance-none cursor-pointer"
          >
           <option value="" disabled>
            {locale === 'ar' ? 'اختر رمز القالب...' : 'Select template code...'}
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
           Loading trigger metadata...
          </p>
         ) : template.code && (() => {
          const evt = triggerEvents.find((e: TriggerEvent) => e.code === template.code);
          return evt ? (
           <p className="text-[9px] text-muted-foreground/45 font-medium mt-1.5 ms-1">
            {evt.description} — Entity: <span className="font-mono text-operational-cyan">{evt.entityType}</span>
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
          onChange={(e) => setTemplate(prev => ({ ...prev, bodyAr: e.target.value }))}
          placeholder="الصنف {{item_name}} وصل إلى كمية {{qty}}..."
          dir="rtl"
          className="w-full min-h-[200px] rounded-xl p-4 font-mono text-sm leading-relaxed tracking-wide transition-all resize-y outline-none focus:ring-1 focus:ring-brand-gold/50 bg-slate-50 border-slate-200 text-slate-800 shadow-inner dark:bg-[#0a0a0a] dark:border-white/10 dark:text-brand-gold/90 scrollbar-thin dark:scrollbar-thumb-white/10 scrollbar-thumb-slate-300"
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
          onChange={(e) => setTemplate(prev => ({ ...prev, bodyEn: e.target.value }))}
          placeholder="Item {{item_name}} reached low quantity of {{qty}}..."
          dir="ltr"
          className="w-full min-h-[200px] rounded-xl p-4 font-mono text-sm leading-relaxed tracking-wide transition-all resize-y outline-none focus:ring-1 focus:ring-brand-gold/50 bg-slate-50 border-slate-200 text-slate-800 shadow-inner dark:bg-[#0a0a0a] dark:border-white/10 dark:text-brand-gold/90 scrollbar-thin dark:scrollbar-thumb-white/10 scrollbar-thumb-slate-300"
         />
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
