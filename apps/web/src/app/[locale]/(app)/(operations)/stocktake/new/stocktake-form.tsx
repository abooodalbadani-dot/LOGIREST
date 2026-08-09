"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUnsavedChangesGuard } from "@/lib/unsaved-changes/useUnsavedChangesGuard";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { 
 ArrowLeft, 
 ArrowRight,
 Warehouse, 
 FileText, 
 Settings2,
 ChevronRight,
 ClipboardList,
 CheckCircle2,
 Lock,
 Scale
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LockBanner } from "@/components/ui/lock-banner";
import { PostConfirmDialog } from "@/components/shared/PostConfirmDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { 
 Form, 
 FormControl, 
 FormField, 
 FormItem, 
 FormLabel, 
 FormMessage 
} from "@/components/ui/form";
import { SmartCombobox } from "@/components/shared/SmartCombobox";
import { useWarehouses } from "@/features/warehouses/hooks/useWarehouses";
import { useCreateStocktake } from "@/features/operations/api/useStocktakes";
import { useInventoryBalance } from "@/features/inventory/hooks/useInventoryBalance";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { useWarehouseLock } from "@/hooks/useWarehouseLock";
import { useAuth } from "@/providers/AuthProvider";
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { onFormError } from "@/hooks/useFormError";

const buildFormSchema = (t: (k: string) => string) => z.object({
 warehouseId: z.string().min(1, t('validation.warehouse_required')),
 sessionName: z.string().min(3, t('validation.session_name_min')),
 description: z.string().optional(),
});

type StocktakeFormValues = z.infer<ReturnType<typeof buildFormSchema>>;

export function StocktakeForm({ locale }: { locale: 'ar' | 'en' }) {
 const t = useTranslations("operations.stocktake");
 const tc = useTranslations("common");
 const { data: warehousesData, isLoading: warehousesLoading } = useWarehouses(); const warehouses = warehousesData?.data || [];
 const { user } = useAuth();
 const createStocktake = useCreateStocktake();
 const { playSound } = useAudioFeedback();

 const isScopeless = user?.role === 'ADMIN';

 const assignedWarehouseIds = React.useMemo(() => {
  if (isScopeless || !user?.scopes) return null;
  const ids = user.scopes.map(s => s.warehouseId).filter(Boolean) as string[];
  return ids.length > 0 ? ids : null;
 }, [user, isScopeless]);

 const filteredWarehouses = React.useMemo(() => {
  if (isScopeless || !warehouses || !assignedWarehouseIds) return warehouses;
  return warehouses.filter(w => assignedWarehouseIds.includes(w.id));
 }, [warehouses, assignedWarehouseIds, isScopeless]);

 const [confirmOpen, setConfirmOpen] = useState(false);

 const formSchema = buildFormSchema((k) => t(k as Parameters<typeof t>[0]));

 const form = useForm<StocktakeFormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: {
   warehouseId: "",
   sessionName: "",
   description: "",
  },
 });

 const { router } = useUnsavedChangesGuard(form.formState.isDirty);

 const watchedWarehouse = useWatch({
 control: form.control,
 name: "warehouseId",
 });
 const { data: lockStatus } = useWarehouseLock(watchedWarehouse);
 const isWarehouseLocked = !!lockStatus?.isLocked;

 const { data: inventoryBalances, isLoading: isBalanceLoading } = useInventoryBalance(
  watchedWarehouse ? { warehouse_id: watchedWarehouse } : undefined,
  { enabled: !!watchedWarehouse }
 );
 const eligibleItemCount = inventoryBalances?.data?.length ?? 0;

 const onSubmit = (data: StocktakeFormValues) => {
  createStocktake.mutate({
   data: {
    sessionName: data.sessionName,
    warehouseId: data.warehouseId,
    description: data.description,
   },
  }, {
   onSuccess: (session) => {
    playSound('success');
    router.push(`/stocktake/${session.id}`, { skipGuard: true });
   },
   onError: (error) => {
    playSound('error');
    console.error("Failed to create stocktake session", error);
   },
  });
 };

 if (warehousesLoading) {
 return (
 <div className="space-y-6 animate-pulse">
 <div className="h-20 bg-card border border-border shadow-sm rounded-3xl" />
 <div className="h-64 bg-card border border-border shadow-sm rounded-[2.5rem]" />
 </div>
 );
 }

 const warehouseItems = (filteredWarehouses || []).map(w => ({
  id: w.id,
  name_en: w.name || '',
  name_ar: w.name || '',
  code: w.code,
 }));

 return (
 <PermissionGate resource="operations_stocktake" action="create">
 <Form {...form}>
  <form 
  onSubmit={form.handleSubmit(() => setConfirmOpen(true), onFormError)} 
  className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full max-w-7xl mx-auto px-0 sm:px-4 py-8"
  >
 <div className="flex justify-start w-full mb-6">
  <Button 
   type="button" 
   variant="ghost" 
   size="sm" 
   onClick={() => router.back()}
   className="text-label-xs font-semibold uppercase text-muted-foreground/60 hover:text-foreground h-10 px-4 rounded-xl flex items-center gap-2"
  >
   {locale === 'ar' ? (
    <ArrowRight className="w-4 h-4" />
   ) : (
    <ArrowLeft className="w-4 h-4" />
   )}
   {tc('back')}
  </Button>
 </div>

 <PageHeader 
 title={t('create_new')}
 description={t('new_session_subtitle')}
 />

 {isWarehouseLocked && (
 <div className="animate-in zoom-in-95 duration-300">
 <LockBanner message={t('warehouse_locked_warning')} />
 </div>
 )}

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
  {/* Form Panel (spans 2 columns) */}
  <div className="lg:col-span-2 bg-card/40 border border-border/50 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-6">
   
   {/* Form Header Info */}
   <div className="flex items-start justify-start text-start gap-6 pb-6 border-b border-border/30">
    <div className="p-4 rounded-[1.5rem] bg-brand-gold/10 text-brand-gold border border-brand-gold/20 shadow-[0_0_20px_rgba(180,142,103,0.1)] shrink-0">
     <Settings2 className="w-8 h-8" />
    </div>
    <div className="text-start">
     <h3 className="text-title-lg font-bold text-foreground text-start">{t('session_parameters')}</h3>
     <p className="text-label-xs font-semibold text-muted-foreground/40 uppercase mt-1 italic text-start">
      {t('operational_audit_config')}
     </p>
    </div>
   </div>

   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <FormField
     control={form.control}
     name="warehouseId"
     render={({ field }) => (
     <FormItem className="space-y-2">
     <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2 px-1">
      <Warehouse className="w-3.5 h-3.5 text-brand-gold" />
      {tc('warehouse')}
     </FormLabel>
     <FormControl>
      <SmartCombobox
       items={warehouseItems}
       value={field.value}
       onSelect={(wh) => field.onChange(wh.id)}
       placeholder={t('select_warehouse')}
       triggerClassName="bg-surface-container-high/30 h-14 px-6 text-label-xs font-bold rounded-2xl shadow-inner shadow-black/5 transition-all w-full"
      />
     </FormControl>
     <FormMessage className="text-label-xxs font-semibold uppercase px-1" />
     </FormItem>
     )}
    />
   
    <FormField
     control={form.control}
     name="sessionName"
     render={({ field }) => (
     <FormItem className="space-y-2">
     <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2 px-1">
      <ClipboardList className="w-3.5 h-3.5 text-brand-gold" />
      {t('session_name_label')}
     </FormLabel>
     <FormControl>
      <Input 
       placeholder={t('session_name_placeholder')} 
       className="bg-surface-container-high/30 h-14 px-6 text-label-xs font-bold rounded-2xl shadow-inner shadow-black/5 transition-all w-full" 
       {...field} 
      />
     </FormControl>
     <FormMessage className="text-label-xxs font-semibold uppercase px-1" />
     </FormItem>
     )}
    />
   
    <FormField
     control={form.control}
     name="description"
     render={({ field }) => (
     <FormItem className="md:col-span-2 space-y-2">
     <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2 px-1">
      <FileText className="w-3.5 h-3.5 text-brand-gold" />
      {t('description_label')}
     </FormLabel>
     <FormControl>
      <Textarea 
       placeholder={t('description_placeholder')} 
       className="bg-surface-container-high/30 min-h-[120px] p-6 text-label-xs font-bold rounded-2xl shadow-inner shadow-black/5 transition-all resize-none" 
       {...field} 
      />
     </FormControl>
     <FormMessage className="text-label-xxs font-semibold uppercase px-1" />
     </FormItem>
     )}
    />
   </div>

   {/* Submission Area */}
   <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-border/20">
    <div className="text-sm text-muted-foreground text-center md:text-start w-full md:w-auto flex items-center justify-center md:justify-start gap-3">
     <div className="w-2.5 h-2.5 rounded-full bg-brand-gold animate-pulse shrink-0" />
     <span>{t('ready_to_initialize')}</span>
    </div>
    
    <div className="flex flex-row items-center gap-3 w-full md:w-auto">
     <Button 
      type="button" 
      variant="ghost" 
      onClick={() => router.back()} 
      className="px-6 py-2 rounded-lg text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors flex-1 md:flex-none"
     >
      {tc('cancel')}
     </Button>
     <Button
      type="submit"
      disabled={createStocktake.isPending || isWarehouseLocked}
      className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
     >
      {createStocktake.isPending ? tc('saving') : (
       <>
        {t('initialize_session')}
        {locale === 'ar' ? (
         <ArrowLeft className="ms-2 w-4 h-4 transition-transform group-hover:-translate-x-1" />
        ) : (
         <ArrowRight className="ms-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
        )}
       </>
      )}
     </Button>
    </div>
   </div>

  </div>

   {/* Contextual Advisory Sidebar */}
   <div className="bg-card/40 border border-border/50 dark:border-brand-gold/20 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl backdrop-blur-md order-first lg:order-last">
    {locale === 'ar' ? (
     <>
      <div className="flex items-center justify-start gap-3 pb-3 border-b border-border/30">
       <div className="p-2.5 rounded-xl bg-brand-gold/15 text-brand-gold border border-brand-gold/30 shadow-sm shrink-0">
        <ClipboardList className="w-5 h-5" />
       </div>
       <h4 className="text-title-sm font-bold text-foreground">
        إرشادات جلسة الجرد
       </h4>
      </div>
      <p className="text-label-sm text-muted-foreground/70 leading-relaxed text-start">
       يرجى قراءة إرشادات الجرد الفعلي التالية لضمان دقة وصحة البيانات المالية للمخزن:
      </p>
      <div className="space-y-3 text-start pt-1">
       <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
        <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-500 shrink-0 mt-0.5">
         <CheckCircle2 className="w-4 h-4" />
        </div>
        <span className="text-label-sm text-foreground/90 leading-relaxed">
         تأكد من ترحيل جميع مستندات الاستلام (GRN) قبل بدء جلسة الجرد.
        </span>
       </div>

       <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
        <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-500 shrink-0 mt-0.5">
         <Lock className="w-4 h-4" />
        </div>
        <span className="text-label-sm text-foreground/90 leading-relaxed">
         سيتم قفل مستودع الجلسة تلقائياً لمنع أي حركات مخزنية أثناء عملية الجرد.
        </span>
       </div>

       <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
        <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-500 shrink-0 mt-0.5">
         <Scale className="w-4 h-4" />
        </div>
        <span className="text-label-sm text-foreground/90 leading-relaxed">
         تأكد من مطابقة وتسوية جميع الفروقات بعد الانتهاء من إدخال الكميات الفعلية.
        </span>
       </div>
      </div>
     </>
    ) : (
     <>
      <div className="flex items-center justify-start gap-3 pb-3 border-b border-border/30">
       <div className="p-2.5 rounded-xl bg-brand-gold/15 text-brand-gold border border-brand-gold/30 shadow-sm shrink-0">
        <ClipboardList className="w-5 h-5" />
       </div>
       <h4 className="text-title-sm font-bold text-foreground">
        Session Guidelines
       </h4>
      </div>
      <p className="text-label-sm text-muted-foreground/70 leading-relaxed text-start">
       Please review the following counting and inventory protocols to ensure the integrity of the ledger:
      </p>
      <div className="space-y-3 text-start pt-1">
       <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
        <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-500 shrink-0 mt-0.5">
         <CheckCircle2 className="w-4 h-4" />
        </div>
        <span className="text-label-sm text-foreground/90 leading-relaxed">
         Ensure all Goods Received Notes (GRNs) are posted before starting the session.
        </span>
       </div>

       <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
        <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-500 shrink-0 mt-0.5">
         <Lock className="w-4 h-4" />
        </div>
        <span className="text-label-sm text-foreground/90 leading-relaxed">
         The selected warehouse will be locked automatically to restrict stock movements during counting.
        </span>
       </div>

       <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
        <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-500 shrink-0 mt-0.5">
         <Scale className="w-4 h-4" />
        </div>
        <span className="text-label-sm text-foreground/90 leading-relaxed">
         Ensure all variances are settled after completing the count entry.
        </span>
       </div>
      </div>
     </>
    )}
   </div>
 </div>

 </form>

 <PostConfirmDialog
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  onConfirm={() => {
   setConfirmOpen(false);
   form.handleSubmit(onSubmit, onFormError)();
  }}
  title={t('create_confirm_title')}
  description={isBalanceLoading
   ? (locale === 'ar' ? 'جاري حساب الأصناف المؤهلة...' : 'Calculating eligible items...')
   : (locale === 'ar'
    ? `أنت على وشك أخذ لقطة لـ ${eligibleItemCount} صنف`
    : `You are about to snapshot ${eligibleItemCount} items`)
  }
  confirmText={tc('confirm')}
  icon="info"
 />
 </Form>
 </PermissionGate>
 );
}
