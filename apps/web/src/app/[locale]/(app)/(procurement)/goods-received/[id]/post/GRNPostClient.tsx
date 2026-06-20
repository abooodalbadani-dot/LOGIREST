'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { useGRN } from '@/features/purchasing/hooks/useGRN';
import { useAuth } from '@/providers/AuthProvider';
import { canPerformActionV2, type DocumentStatus, GRN_STATUS } from '@logirest/shared-types';

import { useBaseCurrency } from '@/hooks/useBaseCurrency';
import { useFXRates } from '@/features/purchasing/hooks/useFXRates';
import { formatCurrency, formatRate, formatNumber } from '@/utils/currency';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle, TrendingUp, ShieldCheck, Wallet, ArrowRightLeft, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { usePostGRN } from '@/features/purchasing/hooks/usePostGRN';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';

const fxRateSchema = z.object({
 fx_rate: z.number().min(0.0001, 'Invalid rate')
});

type FXRateFormValues = z.infer<typeof fxRateSchema>;

interface GRNPostClientProps {
 id: string;
 locale: 'ar' | 'en';
}

export function GRNPostClient({ id, locale }: GRNPostClientProps) {
 const t = useTranslations('procurement.grn');
 const tc = useTranslations('common');
 const router = useRouter();
 const queryClient = useQueryClient();
 const { user } = useAuth();
 
 const { toast } = useToast();
 const { playSound } = useAudioFeedback();
 
 const { data: grn, isLoading: isLoadingGRN } = useGRN(id);
 
 
 const form = useForm<FXRateFormValues>({
  resolver: zodResolver(fxRateSchema),
  defaultValues: {
   fx_rate: 1
  }
 });

 const fxRate = useWatch({ control: form.control, name: 'fx_rate' });
 const { router: guardedRouter } = useUnsavedChangesGuard(form.formState.isDirty);
 const postMutation = usePostGRN({ skipAutoToast: true });

 const { currency: baseCurrency, isLoading: loadingSettings } = useBaseCurrency();
 const supplierCurrency = grn?.currencyCode || 'USD';

 // Live FX conversion logic for display
 const { data: fxRates } = useFXRates(supplierCurrency, baseCurrency);
 
 useEffect(() => {
  if (fxRates?.[0]?.rate && !form.formState.isDirty) {
   form.reset({ fx_rate: fxRates[0].rate });
  }
 }, [fxRates, form]);

 const totalSupplier = useMemo(() => {
 return grn?.lines.reduce((acc, line) => acc + (line.receivedQty * (line.unitCostForeign || 0)), 0) || 0;
 }, [grn]);

 const totalBase = useMemo(() => {
 return totalSupplier * fxRate;
 }, [totalSupplier, fxRate]);

 // Expected rate from PO or master data (for comparison)
 const expectedRate = grn?.poFxRate || fxRates?.[0]?.rate || 1;
 const rateVariance = ((fxRate - expectedRate) / expectedRate) * 100;

 // Enforce role and workflow status (PART 1)
 const canPost = useMemo(() => {
 if (!grn || !user) return false;
 return canPerformActionV2('GRN', grn.status as DocumentStatus, 'POST', user.role);
 }, [grn, user]);

 useEffect(() => {
  if (grn && !isLoadingGRN) {
    // Redirect away only if the GRN is in a terminal state that cannot be posted
    // (POSTED, CANCELLED, VOIDED). Do NOT use isDocumentLocked here — RECEIVED is
    // in the locked list to prevent form edits, but it is the required status for posting.
    const terminalStatuses: string[] = [GRN_STATUS.POSTED, GRN_STATUS.CANCELLED, GRN_STATUS.VOIDED];
    if (terminalStatuses.includes(grn.status)) {
      router.replace(`/goods-received/${id}`);
      return;
    }

    // Strict workflow + role enforcement
    if (!canPerformActionV2('GRN', grn.status as DocumentStatus, 'POST', user?.role)) {
      router.replace(`/goods-received/${id}`);
    }
  }
 }, [grn, isLoadingGRN, id, router, canPost, user]);

 const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);

  const handlePost = async () => {
   try {
    await postMutation.mutateAsync({
     id,
     version: grn?.version || 1
    });
    playSound('success');
    toast.success(t('posted_success'));
    setIsPostDialogOpen(false);
    guardedRouter.push(`/goods-received/${id}`, { skipGuard: true });
   } catch (error: unknown) {
    playSound('error');
    let errorMessage = "";
    if (error && typeof error === 'object') {
     const errObj = error as Record<string, unknown>;
     if (typeof errObj.message === 'string') {
      errorMessage = errObj.message;
     } else if (
      errObj.response &&
      typeof errObj.response === 'object' &&
      'data' in errObj.response &&
      errObj.response.data &&
      typeof errObj.response.data === 'object'
     ) {
      const dataObj = errObj.response.data as Record<string, unknown>;
      if (typeof dataObj.message === 'string') {
       errorMessage = dataObj.message;
      }
     }
    }
    
    if (errorMessage.toLowerCase().includes("frozen") || errorMessage.toLowerCase().includes("locked")) {
     toast.error("تعذر الاعتماد: يوجد صنف مجمد (تحت الجرد) في المستودع الوجهة.", {
      description: errorMessage,
     });
    } else {
     toast.error(tc('error') || "حدث خطأ أثناء اعتماد السند.");
    }
   }
  };

 if (isLoadingGRN || loadingSettings) {
  return <PageSkeleton />;
 }

 if (!grn) {
  return <ErrorState message={tc('not_found')} onRetry={() => queryClient.invalidateQueries({ queryKey: ['grn', id] })} />;
 }

 if (!canPost) {
 return (
 <div className="min-w-0 items-center flex-1 gap-6 justify-center gap-4 flex-col flex h-[60vh] w-full">
 <AlertCircle className="w-12 h-12 text-destructive opacity-50" />
 <p className="text-body-md font-bold uppercase text-muted-foreground">{tc('permission_denied')}</p>
 </div>
 );
 }

 return (
 <div className="flex flex-col gap-10 pb-20 min-w-0">
 <PageHeader
 title={`#${grn.documentNumber}`}
 subtitle={t('fx_capture_title')}
 showStatus
 status={grn.status}
 children={
 <div className="flex items-center gap-4">
 <Button variant="ghost" onClick={() => router.back()} className="rounded-2xl">
 {tc('cancel')}
 </Button>
      <Button 
       onClick={() => setIsPostDialogOpen(true)}
       disabled={postMutation.isPending || fxRate <= 0 || grn.lines.length === 0 || !baseCurrency}
       className="h-14 px-12 bg-primary hover:bg-primary/90 text-primary-foreground text-label-xs font-black uppercase tracking-widest shadow-2xl shadow-primary/30 rounded-2xl transition-all border-none"
      >
       <Send className="w-5 h-5 me-3" />
       {t('post_grn')}
      </Button>
 </div>
 }
 />

 {/* Controlled Post Confirm Dialog — rendered outside PageHeader so it's always mounted */}
 <PostConfirmDialog
  open={isPostDialogOpen}
  onOpenChange={setIsPostDialogOpen}
  title={t('post_confirm_title')}
  description={t('post_confirm_desc')}
  warningText={t('post_irreversible')}
  requiresTextConfirmation={true}
  onConfirm={handlePost}
  isLoading={postMutation.isPending}
  confirmKeyword={t('confirm_keyword') || 'POST'}
 />


 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* FX Panel (PART 2) */}
 <div className="lg:col-span-2 space-y-8">
 <div className="bg-card border border-border shadow-sm p-10 rounded-[32px] border border-white/5 shadow-2xl relative overflow-hidden group">
 <div className="absolute top-0 end-0 p-8 opacity-[0.03] group-hover:opacity-[0.1] transition-all duration-700">
 <TrendingUp className="w-40 h-40" />
 </div>

 <div className="relative z-10 space-y-10">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
 <ArrowRightLeft className="w-5 h-5 text-primary" />
 </div>
 <h3 className="text-label-xs font-semibold uppercase text-primary">{t('fx_capture_title')}</h3>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
 <div className="space-y-4">
 <Label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{tc('order_currency')}</Label>
 <div className="bg-surface-container-highest h-16 rounded-2xl flex items-center px-6 border border-white/5">
 <span className="font-mono font-semibold text-title-lg text-foreground/40">{supplierCurrency}</span>
 </div>
 </div>

 <div className="space-y-4">
 <Label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{tc('base_currency')}</Label>
 <div className="bg-surface-container-highest h-16 rounded-2xl flex items-center px-6 border border-white/5">
 <span className="font-mono font-semibold text-title-lg text-foreground/40">{baseCurrency}</span>
 </div>
 </div>

 <div className="space-y-4">
 <Label className="text-label-xs font-semibold uppercase text-primary/80">{t('fx_capture_title')}</Label>
 <div className="relative group">
        <Input 
         type="number"
         step="0.0001"
         dir="ltr"
         className="h-16 bg-surface-container-highest rounded-2xl border-white/10 focus:border-primary/50 text-headline-lg font-mono font-semibold"
         {...form.register('fx_rate', { valueAsNumber: true })}
        />
 <div className="absolute inset-y-0 end-4 flex items-center">
 <TrendingUp className="w-5 h-5 text-primary/40 group-focus-within:text-primary transition-colors" />
 </div>
 </div>
 </div>

 <div className="flex flex-col justify-end pb-2 min-w-0">
 <div className="flex items-center gap-2">
 <div className={cn(
 "w-2 h-2 rounded-full animate-pulse",
 Math.abs(rateVariance) > 5 ? "bg-destructive" : "bg-primary"
 )} />
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/40 italic">
 * {tc('confirm_rate')}
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Immutability Warning */}
 <div className="bg-amber-500/5 border border-amber-500/20 p-8 rounded-[28px] flex gap-6 items-start">
 <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0">
 <ShieldCheck className="w-6 h-6 text-amber-500" />
 </div>
 <div className="space-y-2">
 <h4 className="text-label-xs font-semibold uppercase text-amber-500">{t('fx_freeze_title')}</h4>
 <p className="text-body-md text-amber-200/60 leading-relaxed font-medium">{t('fx_freeze_desc')}</p>
 </div>
 </div>
 </div>

 {/* Sidebar Summary (PART 3) */}
 <div className="space-y-6">
 <div className="bg-surface-container-high p-8 rounded-[32px] shadow-2xl border border-white/10 space-y-8">
 <div className="flex items-center justify-between">
 <div className="space-y-2">
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/50">{tc('supplier')}</p>
 <h2 className="text-title-lg font-bold">{grn.supplier?.name || t('mock_supplier_1')}</h2>
 </div>
 <div className="w-12 h-12 bg-card/5 rounded-2xl flex items-center justify-center">
 <Wallet className="w-6 h-6 text-muted-foreground/40" />
 </div>
 </div>

 <div className="h-px bg-card/5" />

 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/50">{tc('total')} ({supplierCurrency})</p>
 <p dir="ltr" className="font-mono font-semibold text-title-sm">{formatCurrency(totalSupplier, supplierCurrency, locale)}</p>
 </div>
 
 <div className="space-y-3 bg-surface-container-highest/50 p-6 rounded-2xl border border-white/5">
 <div className="flex justify-between items-center opacity-60">
 <p className="text-label-xxs font-bold uppercase">{t('market_rate')}</p>
 <p dir="ltr" className="font-mono text-label-sm">{formatRate(expectedRate, locale, 4)}</p>
 </div>
 <div className="flex justify-between items-center">
 <p className="text-label-xxs font-bold uppercase">{t('rate_variance')}</p>
 <p dir="ltr" className={cn(
 "font-mono text-label-sm font-semibold",
 rateVariance > 0 ? "text-foreground" : rateVariance < 0 ? "text-destructive" : "text-muted-foreground"
 )}>
 {rateVariance > 0 ? '+' : ''}{formatNumber(rateVariance, locale, 2)}%
 </p>
 </div>
 </div>

 <div className="flex justify-between items-center bg-primary/5 p-6 rounded-2xl border border-primary/10 relative overflow-hidden group">
 <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
 <div className="relative z-10 flex flex-col gap-1 min-w-0">
 <p className="text-label-xs font-semibold uppercase text-primary/60">{tc('base_currency')}</p>
 <p dir="ltr" className="font-mono font-semibold text-headline-lg text-primary">{formatCurrency(totalBase, baseCurrency, locale)}</p>
 </div>
 </div>
 </div>

 <div className="space-y-2 pt-4">
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/30 text-center leading-relaxed">
 {tc('posting_irreversible')}
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
