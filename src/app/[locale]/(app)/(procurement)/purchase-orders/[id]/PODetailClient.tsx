'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePO } from '@/features/purchasing/hooks/usePO';
import { useSubmitPO } from '@/features/purchasing/hooks/useSubmitPO';
import { Button } from '@/components/ui/button';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { StatusTimeline, type Status } from '@/components/shared/StatusTimeline';
import { StatusBadge, type BadgeStatus } from '@/components/ui/status-badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PurchaseOrderForm } from '@/features/purchasing/components/po-form';
import { Badge } from '@/components/ui/badge';
import { Save, Send, Clock, Wallet, TrendingUp, Truck, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

const buildSchema = (t: (k: string) => string) =>
  z.object({
    supplier_id:            z.string().min(1, t('validation.supplier_required')),
    currency_id:            z.string().min(1, t('validation.currency_required')),
    target_warehouse_id:    z.string().min(1),
    expected_delivery_date: z.string().optional(),
  });

type POHeaderFormValues = z.infer<ReturnType<typeof buildSchema>>;


export function PODetailClient({ id, locale }: { id: string | null; locale: 'ar' | 'en' }) {
  const t = useTranslations('procurement.po');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { data: po, isLoading } = usePO(id || '');
  const submitMutation = useSubmitPO();

  const isNew = !id || id === 'new';
  const isDraft = isNew || po?.status === 'DRAFT';
  const isSubmitted = po?.status === 'SUBMITTED';

  if (isLoading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center bg-surface-container-low shadow-xl rounded-2xl animate-pulse">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
        <p className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">{t('sync_context')}</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!id) return;
    try {
      await submitMutation.mutateAsync(id);
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const timeline = po?.audit_log?.map((log: any) => ({
    status: log.status.toLowerCase() as Status,
    at: log.created_at,
    by: log.user_name || tCommon('system')
  })) || [];

  return (
    <div className="flex flex-col gap-10 relative pb-20">
      <PageHeader
        title={isNew ? t('create_new') : `#${po?.document_number}`}
        description={isNew ? t('commitment_intent') : t('specification')}
        status={po?.status as BadgeStatus}
        showStatus={!isNew}
        actions={
          <div className="flex items-center gap-3">
            <PermissionGate action="submit" resource="po">
              {po?.status === 'DRAFT' && (
                <Button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="bg-operational-cyan text-primary-foreground hover:brightness-110 px-8 h-11 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px]"
                >
                  <Send className="w-4 h-4 me-2" />
                  {t('actions.submit')}
                </Button>
              )}
            </PermissionGate>

            <PermissionGate action="approve" resource="po">
              {isSubmitted && (
                <Button
                  onClick={() => router.push(`/${locale}/purchase-orders/${id}/approve`)}
                  className="bg-operational-cyan text-primary-foreground hover:brightness-110 px-8 h-11 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px]"
                >
                  <CheckCircle className="w-4 h-4 me-2" />
                  {t('actions.go_to_approval')}
                </Button>
              )}
            </PermissionGate>
          </div>
        }
      />

      {isDraft ? (
        <PurchaseOrderForm initialData={po} mode={isNew ? 'create' : 'edit'} />
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <div className="bg-surface-container-low p-6 rounded-2xl shadow-sm flex flex-col gap-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">{tCommon('supplier')}</p>
                <p className="font-bold text-lg tracking-tight mt-2">{po?.supplier_name || po?.supplier_id}</p>
             </div>
             <div className="bg-surface-container-low p-6 rounded-2xl shadow-sm flex flex-col gap-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">{tCommon('order_currency')}</p>
                <p className="font-mono font-bold text-lg tracking-tight text-operational-cyan mt-2">{po?.currency_id}</p>
             </div>
             <div className="bg-surface-container-low p-6 rounded-2xl shadow-sm flex flex-col gap-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">{t('target_warehouse')}</p>
                <p className="font-bold text-lg tracking-tight mt-2">{po?.warehouse_name || po?.target_warehouse_id}</p>
             </div>
             <div className="bg-surface-container-low p-6 rounded-2xl shadow-sm flex flex-col gap-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">{t('expected_delivery_date')}</p>
                <p className="font-mono font-bold text-lg tracking-tight mt-2" dir="ltr">{po?.expected_delivery_date || '—'}</p>
             </div>
          </div>

          <DocumentReadOnlyOverlay isPosted={true}>
            <div className="bg-surface-container-low rounded-3xl overflow-hidden shadow-xl border border-white/5">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-surface-container-high/50 border-b border-white/5">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-start">{tCommon('item')}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-end">{tCommon('quantity')}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-end">{t('unit_price')}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-end">{t('subtotal')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {po?.lines?.map((line: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-black text-operational-cyan tracking-widest uppercase">{line.item_sku || line.item_id}</span>
                          <span className="text-sm font-bold text-foreground/80">{line.item_name || tCommon('not_available')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-end">
                        <span dir="ltr" className="font-mono font-bold text-foreground/80">{line.quantity || line.qty} {line.uom_id}</span>
                      </td>
                      <td className="px-6 py-4 text-end">
                        <span dir="ltr" className="font-mono font-bold text-operational-cyan">{line.unit_price || line.unit_cost_foreign}</span>
                      </td>
                      <td className="px-6 py-4 text-end">
                        <span dir="ltr" className="font-mono font-black text-foreground">
                          {((line.quantity || line.qty || 0) * (line.unit_price || line.unit_cost_foreign || 0)).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DocumentReadOnlyOverlay>

          <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-8">
            <div className="bg-surface-container-high p-8 rounded-3xl shadow-2xl relative overflow-hidden min-w-[320px] border border-white/5">
              <div className="absolute top-0 end-0 w-1.5 h-full bg-operational-cyan shadow-[0_0_20px_rgba(var(--operational-cyan-rgb),0.5)]" />
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-10">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('order_total')}</p>
                  <p dir="ltr" className="text-3xl font-display font-black tracking-tighter text-foreground">
                    {po?.total?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {timeline.length > 0 && (
            <div className="bg-surface-container-low p-8 rounded-3xl shadow-lg border border-white/5 transition-all">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 mb-10">{t('ledger_history')}</h3>
              <StatusTimeline entries={timeline} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
