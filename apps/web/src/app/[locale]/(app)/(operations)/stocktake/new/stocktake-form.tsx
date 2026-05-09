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
 Warehouse, 
 FileText, 
 Settings2,
 ChevronRight,
 ClipboardList
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LockBanner } from "@/components/ui/lock-banner";
import { PostConfirmDialog } from "@/components/ui/post-confirm-dialog";
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
import { 
 Select, 
 SelectContent, 
 SelectItem, 
 SelectTrigger, 
 SelectValue 
} from "@/components/ui/select";
import { useWarehouses } from "@/features/warehouses/api/useWarehouses";
import { useCreateStocktake } from "@/features/operations/api/useStocktakes";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { useWarehouseLock } from "@/hooks/useWarehouseLock";

const buildFormSchema = (t: (k: string) => string) => z.object({
 warehouseId: z.string().min(1, t('validation.warehouse_required')),
 sessionName: z.string().min(3, t('validation.session_name_min')),
 description: z.string().optional(),
});

type StocktakeFormValues = z.infer<ReturnType<typeof buildFormSchema>>;

export function StocktakeForm({ locale }: { locale: 'ar' | 'en' }) {
  const t = useTranslations("operations.stocktake");
  const tc = useTranslations("common");
  const { data: warehouses, isLoading: warehousesLoading } = useWarehouses();
  const createStocktake = useCreateStocktake();

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

 const onSubmit = (data: StocktakeFormValues) => {
    createStocktake.mutate({
      session_name: data.sessionName,
      warehouse_id: data.warehouseId,
      description: data.description,
    }, {
      onSuccess: (session) => {
        router.push(`/stocktake/${session.id}`, { skipGuard: true });
      },
      onError: (error) => {
        console.error("Failed to create stocktake session", error);
      },
    });
  };

 if (warehousesLoading) {
 return (
 <div className="space-y-6 animate-pulse">
 <div className="h-20 bg-surface-container-low rounded-3xl" />
 <div className="h-64 bg-surface-container-low rounded-[2.5rem]" />
 </div>
 );
 }

 return (
 <PermissionGate resource="operations_stocktake" action="create">
 <Form {...form}>
 <form 
 onSubmit={form.handleSubmit(() => setConfirmOpen(true))} 
 className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto"
 >
 <PageHeader 
 title={t('create_new')}
 description={t('new_session_subtitle')}
 actions={
 <Button 
 type="button" 
 variant="ghost" 
 size="sm" 
 onClick={() => router.back()}
 className="text-label-xs font-semibold uppercase text-muted-foreground/60 hover:text-foreground h-10 px-4 rounded-xl"
 >
 <ArrowLeft className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180 ml-2' : 'mr-2'}`} />
 {tc('back')}
 </Button>
 }
 />

 {isWarehouseLocked && (
 <div className="animate-in zoom-in-95 duration-300">
 <LockBanner message={t('warehouse_locked_warning')} />
 </div>
 )}

 <Card className="bg-surface-container-low border-none shadow-2xl shadow-black/5 rounded-[2.5rem] overflow-hidden">
 <CardContent className="p-10 space-y-10">
 {/* Form Header Info */}
 <div className="flex items-center gap-6 pb-8 border-b border-surface-container-high/50">
 <div className="p-4 rounded-[1.5rem] bg-cyan-600/10 text-cyan-500 border border-cyan-500/20 shadow-[0_0_20px_rgba(8,145,178,0.1)]">
 <Settings2 className="w-8 h-8" />
 </div>
 <div>
 <h3 className="text-title-lg font-bold text-foreground">{t('session_parameters')}</h3>
 <p className="text-label-xs font-semibold text-muted-foreground/40 uppercase mt-1 italic">
 {t('operational_audit_config')}
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
 <FormField
 control={form.control}
 name="warehouseId"
 render={({ field }) => (
 <FormItem className="space-y-4">
 <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2 px-1">
 <Warehouse className="w-3.5 h-3.5" />
 {tc('warehouse')}
 </FormLabel>
 <Select onValueChange={field.onChange} defaultValue={field.value}>
 <FormControl>
 <SelectTrigger className="bg-surface-container-high/30 border-none h-14 px-6 text-label-xs font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20 transition-all">
 <SelectValue placeholder={t('select_warehouse')} />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="bg-surface-container-highest border border-surface-container-high/50 shadow-2xl rounded-2xl overflow-hidden">
 {warehouses?.map((wh) => (
 <SelectItem key={wh.id} value={wh.id} className="text-label-xs font-bold py-3">
 {locale === 'ar' ? wh.nameAr : wh.nameEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <FormMessage className="text-label-xxs font-semibold uppercase px-1" />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="sessionName"
 render={({ field }) => (
 <FormItem className="space-y-4">
 <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2 px-1">
 <ClipboardList className="w-3.5 h-3.5" />
 {t('session_name_label')}
 </FormLabel>
 <FormControl>
 <Input 
 placeholder={t('session_name_placeholder')} 
 className="bg-surface-container-high/30 border-none h-14 px-6 text-label-xs font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20 transition-all" 
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
 <FormItem className="md:col-span-2 space-y-4">
 <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2 px-1">
 <FileText className="w-3.5 h-3.5" />
 {t('description_label')}
 </FormLabel>
 <FormControl>
 <Textarea 
 placeholder={t('description_placeholder')} 
 className="bg-surface-container-high/30 border-none min-h-[120px] p-6 text-label-xs font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none" 
 {...field} 
 />
 </FormControl>
 <FormMessage className="text-label-xxs font-semibold uppercase px-1" />
 </FormItem>
 )}
 />
 </div>
 </CardContent>

 {/* Submission Area */}
 <div className="p-10 bg-surface-container-medium/30 border-t border-surface-container-high/50 flex flex-col md:flex-row items-center justify-between gap-6">
 <div className="flex items-center gap-4">
 <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase">
 {t('ready_to_initialize')}
 </p>
 </div>
 
 <div className="flex items-center gap-4 w-full md:w-auto">
 <Button 
 type="button" 
 variant="ghost" 
 onClick={() => router.back()} 
 className="flex-1 md:flex-none h-14 px-8 text-label-xs font-semibold uppercase text-muted-foreground/60 hover:text-foreground rounded-2xl"
 >
 {tc('cancel')}
 </Button>
 <Button
 type="submit"
 disabled={createStocktake.isPending || isWarehouseLocked}
 className="flex-1 md:flex-none h-14 px-12 bg-cyan-600 hover:bg-cyan-500 text-white text-label-xs font-semibold uppercase rounded-[1.5rem] transition-all shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] disabled:opacity-30 disabled:grayscale group"
 >
 {createStocktake.isPending ? tc('saving') : (
 <>
 {t('initialize_session')}
 <ChevronRight className={`ms-2 w-4 h-4 transition-transform group-hover:translate-x-1 ${locale === 'ar' ? 'rotate-180' : ''}`} />
 </>
 )}
 </Button>
 </div>
 </div>
 </Card>
 </form>

 <PostConfirmDialog
 isOpen={confirmOpen}
 onOpenChange={setConfirmOpen}
 onConfirm={() => {
 setConfirmOpen(false);
 form.handleSubmit(onSubmit)();
 }}
 title={t('create_confirm_title')}
 description={t('create_confirm_desc')}
 confirmText={tc('confirm')}
 />
 </Form>
 </PermissionGate>
 );
}
