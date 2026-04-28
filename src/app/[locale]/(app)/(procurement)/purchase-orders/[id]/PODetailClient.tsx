'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePO } from '@/features/purchasing/hooks/usePO';
import { useCreatePO } from '@/features/purchasing/hooks/useCreatePO';
import { usePostPO } from '@/features/purchasing/hooks/usePostPO';
import { useSuppliers } from '@/features/purchasing/hooks/useSuppliers';
import { useCurrencies } from '@/features/purchasing/hooks/useCurrencies';
import { useFXRates } from '@/features/purchasing/hooks/useFXRates';
import { Button } from '@/components/ui/button';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { StatusTimeline, type Status } from '@/components/shared/StatusTimeline';
import { StatusBadge, type BadgeStatus } from '@/components/ui/status-badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Save, Send, ClipboardList, Clock, ArrowRight, Wallet, TrendingUp } from 'lucide-react';

const poHeaderSchema = z.object({
  supplier_id: z.string().min(1, 'Required'),
  currency_id: z.string().min(1, 'Required'),
  expected_delivery_date: z.string().optional(),
});

type POHeaderFormValues = z.infer<typeof poHeaderSchema>;

export function PODetailClient({ id, locale }: { id: string | null; locale: 'ar' | 'en' }) {
  const t = useTranslations('procurement.po');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledPrId = searchParams?.get('pr_id');
  
  const { data: po, isLoading } = usePO(id || '');
  const { data: suppliers } = useSuppliers();
  const { data: currencies } = useCurrencies();
  
  const createPOMutation = useCreatePO();
  const postPOMutation = usePostPO();

  const [postConfirmOpen, setPostConfirmOpen] = useState(false);
  
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<POHeaderFormValues>({
    resolver: zodResolver(poHeaderSchema),
    defaultValues: {
      supplier_id: '',
      currency_id: 'USD',
      expected_delivery_date: '',
    }
  });

  const currencyId = watch('currency_id');

  useEffect(() => {
    if (po) {
      reset({
        supplier_id: po.supplier_id || '',
        currency_id: po.currency_id || 'USD',
        expected_delivery_date: po.expected_delivery_date || '',
      });
    }
  }, [po, reset]);

  // Live FX conversion logic
  const baseCurrency = currencies?.find(c => c.is_base)?.code || 'SAR';
  const { data: fxRates } = useFXRates(currencyId, baseCurrency);
  const currentFxRate = fxRates?.[0]?.rate || 1;

  const isNew = !id;
  const isReadOnly = !isNew && po?.status !== 'DRAFT';

  // Calculate local totals
  const totalForeign = useMemo(() => {
    const lines = po?.lines;
    if (!lines) return 0;
    return lines.reduce((acc, line) => acc + (line.qty * line.unit_cost_foreign), 0);
  }, [po?.lines]);

  const handleSaveDraft = handleSubmit(async (values) => {
    try {
      await createPOMutation.mutateAsync({
        ...values,
        target_warehouse_id: 'wh-1',
        linked_pr_id: prefilledPrId || undefined,
        lines: [] 
      });
      router.push('/purchase-orders');
    } catch (e) {
      console.error(e);
    }
  });

  const handlePost = async () => {
    if (!id) return;
    try {
      await postPOMutation.mutateAsync(id);
      setPostConfirmOpen(false);
      router.push(`/goods-received/new?po_id=${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return (
    <div className="flex flex-col h-[60vh] items-center justify-center bg-surface-container-low shadow-xl rounded-2xl animate-pulse">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-primary tracking-tighter">PO</div>
      </div>
      <p className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 animate-pulse">Synchronizing Order Context...</p>
    </div>
  );

  const mockTimeline = po ? [
    { status: po.status.toLowerCase() as Status, at: new Date().toISOString(), by: 'System User' }
  ] : [];

  return (
    <div className="flex flex-col gap-10 relative pb-20">
      <PageHeader
        title={isNew ? t('create_new') : `#${po?.document_number}`}
        description={isNew ? t('commitment_intent') : t('specification')}
        status={po?.status as BadgeStatus}
        showStatus={!isNew}
        actions={
          <div className="flex items-center gap-3">
            <PermissionGate action={isNew ? 'create' : 'edit'} resource="po">
              {(isNew || po?.status === 'DRAFT') && (
                <Button 
                  onClick={handleSaveDraft} 
                  disabled={createPOMutation.isPending} 
                  variant="outline"
                  className="h-11 px-6 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
                >
                  <Save className="w-4 h-4 me-2 opacity-60" />
                  {t('save_draft')}
                </Button>
              )}
            </PermissionGate>
            
            <PermissionGate action="post" resource="po">
              {!isNew && !isReadOnly && (
                <Button 
                  onClick={() => setPostConfirmOpen(true)}
                  className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-all rounded-2xl"
                >
                  <Send className="w-4 h-4 me-2" />
                  {t('post_po')}
                </Button>
              )}
            </PermissionGate>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Supplier Selector */}
        <div className="bg-surface-container-low p-6 rounded-2xl shadow-sm flex flex-col gap-1 transition-all hover:bg-surface-container-medium group relative overflow-hidden">
          <Label htmlFor="supplier-select" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 group-hover:text-cyan-500/60 transition-colors">
            {tCommon('supplier')}
          </Label>
          {isReadOnly ? (
             <p className="font-bold text-lg tracking-tight mt-2">{suppliers?.find(s => s.id === po?.supplier_id)?.name_en || po?.supplier_id}</p>
          ) : (
            <>
              <select 
                id="supplier-select"
                {...register('supplier_id')}
                className="mt-2 p-3 bg-surface-container-highest rounded-2xl focus:ring-1 focus:ring-primary/50 outline-none transition-all text-sm font-medium"
              >
                <option value="">{tCommon('select_supplier')}</option>
                {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name_en}</option>)}
              </select>
              {errors.supplier_id && <span className="text-[10px] text-destructive mt-1 font-bold">{errors.supplier_id.message}</span>}
            </>
          )}
        </div>

        {/* Currency Selector */}
        <div className="bg-surface-container-low p-6 rounded-2xl shadow-sm flex flex-col gap-1 transition-all hover:bg-surface-container-medium group relative overflow-hidden">
           <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
            <Wallet className="w-12 h-12" />
          </div>
           <Label htmlFor="currency-select" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 group-hover:text-cyan-500/60 transition-colors">
            {tCommon('order_currency')}
           </Label>
           {isReadOnly ? (
             <p className="font-mono font-bold text-lg tracking-tight text-cyan-500 mt-2">{po?.currency_id}</p>
           ) : (
            <>
              <select 
                id="currency-select"
                {...register('currency_id')}
                className="mt-2 p-3 bg-surface-container-highest rounded-2xl focus:ring-1 focus:ring-primary/50 outline-none transition-all text-sm font-medium"
              >
                {currencies?.map(c => <option key={c.id} value={c.code}>{c.code} - {c.name}</option>)}
              </select>
              {errors.currency_id && <span className="text-[10px] text-destructive mt-1 font-bold">{errors.currency_id.message}</span>}
            </>
           )}
        </div>

        {/* Expected Delivery Date */}
        <div className="bg-surface-container-low p-6 rounded-2xl shadow-sm flex flex-col gap-1 transition-all hover:bg-surface-container-medium group relative overflow-hidden">
          <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
            <Clock className="w-12 h-12" />
          </div>
           <Label htmlFor="delivery-date-input" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 group-hover:text-cyan-500/60 transition-colors">
            {t('expected_delivery_date')}
           </Label>
          {isReadOnly ? (
             <p className="font-mono font-bold text-lg tracking-tight text-foreground/80 mt-2">{po?.expected_delivery_date || '-'}</p>
          ) : (
            <input 
              id="delivery-date-input"
              type="date"
              {...register('expected_delivery_date')}
              className="mt-2 p-3 bg-surface-container-highest rounded-2xl focus:ring-1 focus:ring-primary/50 outline-none transition-all text-sm font-medium"
            />
          )}
        </div>

        {/* Linked PR */}
        <div className="bg-surface-container-low p-6 rounded-2xl shadow-sm flex flex-col gap-1 transition-all hover:bg-surface-container-medium group relative overflow-hidden text-end">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 group-hover:text-cyan-500/60 transition-colors">{t('origin_context')}</p>
          <div className="mt-2">
            {po?.linked_pr_number ? (
              <Badge variant="outline" className="h-8 px-4 bg-cyan-500/10 text-cyan-500 border-cyan-500/30 text-[10px] font-black uppercase tracking-tighter">PR {po.linked_pr_number}</Badge>
            ) : prefilledPrId ? (
              <Badge variant="outline" className="h-8 px-4 border-dashed border-cyan-500/50 text-cyan-500/70 text-[10px] font-black uppercase">{t('pending_linking')}</Badge>
            ) : (
              <p className="font-bold text-lg text-muted-foreground/30 tracking-tighter italic uppercase">{t('independent_order')}</p>
            )}
          </div>
        </div>
      </div>

      <DocumentReadOnlyOverlay isPosted={isReadOnly}>
        <DocumentLineItemTable
          lines={po?.lines || []}
          locale={locale}
          isReadOnly={isReadOnly}
          extraColumns={[
            {
              header: t('ordered_qty'),
              cell: (line) => isReadOnly ? (
                 <span dir="ltr" className="font-mono font-bold text-foreground/80">{line.qty} {line.uom_id}</span>
              ) : (
                <input type="number" defaultValue={line.qty} aria-label={t('ordered_qty')} className="w-24 px-3 py-2 bg-surface-container-highest rounded-2xl font-mono text-sm focus:ring-1 focus:ring-primary outline-none transition-all" dir="ltr" />
              )
            },
            {
              header: `${t('unit_price')} (${currencyId})`,
              cell: (line) => isReadOnly ? (
                 <span dir="ltr" className="font-mono font-bold text-cyan-500">{line.unit_cost_foreign as number}</span>
              ) : (
                <input type="number" defaultValue={line.unit_cost_foreign as number} aria-label={t('unit_price')} className="w-28 px-3 py-2 bg-surface-container-highest rounded-2xl font-mono text-sm focus:ring-1 focus:ring-primary outline-none transition-all" dir="ltr" />
              )
            },
            {
              header: t('subtotal'),
              cell: (line) => (
                <span dir="ltr" className="font-mono font-black text-foreground">
                  {((line.qty || 0) * (line.unit_cost_foreign as number || 0)).toLocaleString()}
                </span>
              )
            }
          ]}
        />
      </DocumentReadOnlyOverlay>

      {/* Financial Summary */}
      <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-8">
        <div className="flex flex-col items-end gap-1 px-6 border-e border-white/5">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">{t('exchange_index')}</p>
           <div className="flex items-center gap-2 text-cyan-500">
             <TrendingUp className="w-3 h-3" />
             <p className="text-xs font-mono font-bold">1 {currencyId} = {currentFxRate} {baseCurrency}</p>
           </div>
        </div>

        <div className="bg-surface-container-high p-8 rounded-2xl shadow-2xl relative overflow-hidden min-w-[320px]">
          <div className="absolute top-0 end-0 w-1 h-full bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
          
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('order_total')} ({currencyId})</p>
              <p dir="ltr" className="text-3xl font-display font-black tracking-tighter text-foreground">{(totalForeign || po?.total || 0).toLocaleString()}</p>
            </div>
            
            <div className="h-px bg-white/5 w-full" />
            
            <div className="flex justify-between items-center gap-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/60">{t('local_equiv')} ({baseCurrency})</p>
              <p dir="ltr" className="text-xl font-mono font-black text-cyan-500">{( (totalForeign || po?.total || 0) * currentFxRate ).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {mockTimeline.length > 0 && (
        <div className="bg-surface-container-low p-8 rounded-2xl shadow-lg transition-all hover:bg-surface-container-medium/50">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 mb-10">{t('ledger_history')}</h3>
          <StatusTimeline entries={mockTimeline} />
        </div>
      )}

      <PostConfirmDialog 
        open={postConfirmOpen}
        onOpenChange={setPostConfirmOpen}
        onConfirm={handlePost}
        title={t('post_confirm_title')}
        description={t('post_confirm_desc')}
        warningText={t('warning_irreversible')}
      />
    </div>
  );
}
