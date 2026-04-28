'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { StatusBadge } from '@/components/ui/status-badge';
import { LockBanner } from '@/components/shared/LockBanner';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { Button } from '@/components/ui/button';
import { useStocktakeSession } from '@/features/operations/hooks/useStocktakeSession';
import { useUpdateCount } from '@/features/operations/hooks/useUpdateCount';
import { usePostStocktake } from '@/features/operations/hooks/usePostStocktake';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import type { StocktakeCount } from '@/features/operations/hooks/useStocktakeSession';
import { format } from 'date-fns';
import { CheckCircle, AlertTriangle, Info, Warehouse, User, BarChart3, Save, Clock, ChevronRight } from 'lucide-react';

type LocalCount = StocktakeCount & {
  local_counted_qty: number | null;
  local_variance_reason: string;
  is_saving: boolean;
  is_saved: boolean;
};

import { PermissionGate } from '@/components/shared/PermissionGate';

export function StocktakeDetailClient({ id, locale }: { id: string; locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.stocktake');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const { data: session, isLoading } = useStocktakeSession(id);
  const { data: lockState } = useWarehouseLock(session?.warehouse_id ?? null);
  const updateCount = useUpdateCount(id);
  const postStocktake = usePostStocktake(id, session?.warehouse_id ?? '');

  const [localCounts, setLocalCounts] = useState<LocalCount[]>([]);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);

  useEffect(() => {
    if (session?.counts) {
      const timer = setTimeout(() => {
        setLocalCounts(session.counts.map(c => ({
          ...c,
          local_counted_qty: c.counted_qty,
          local_variance_reason: c.variance_reason ?? '',
          is_saving: false,
          is_saved: false,
        })));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [session]);

  const isPosted = session?.status === 'POSTED';
  const isActive = ['OPEN', 'COUNTING'].includes(session?.status ?? '');

  const hasUnresolvedVariances = localCounts.some(c => {
    const variance = (c.local_counted_qty ?? 0) - c.snapshot_qty;
    return c.local_counted_qty !== null && variance !== 0 && !c.local_variance_reason;
  });

  const allCounted = localCounts.length > 0 && localCounts.every(c => c.local_counted_qty !== null);

  const handleCountedQtyBlur = async (countId: string, countedQty: number) => {
    setLocalCounts(prev => prev.map(c => c.id === countId ? { ...c, is_saving: true, is_saved: false } : c));
    try {
      const localCount = localCounts.find(c => c.id === countId);
      await updateCount.mutateAsync({
        countId,
        counted_qty: countedQty,
        variance_reason: localCount?.local_variance_reason || undefined,
      });
      setLocalCounts(prev => prev.map(c => c.id === countId ? { ...c, is_saving: false, is_saved: true } : c));
      setTimeout(() => {
        setLocalCounts(prev => prev.map(c => c.id === countId ? { ...c, is_saved: false } : c));
      }, 2000);
    } catch {
      setLocalCounts(prev => prev.map(c => c.id === countId ? { ...c, is_saving: false } : c));
    }
  };

  const handlePost = async () => {
    await postStocktake.mutateAsync();
    setIsPostDialogOpen(false);
    router.push(`/${locale}/stocktake`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 border-[6px] border-cyan-500/5 rounded-full" />
          <div className="absolute inset-0 border-[6px] border-t-cyan-500 rounded-full animate-spin shadow-[0_0_30px_rgba(6,182,212,0.3)]" />
          <div className="absolute inset-4 border border-white/5 rounded-full flex items-center justify-center bg-surface-container-low shadow-inner">
            <BarChart3 className="w-8 h-8 text-cyan-500 animate-pulse" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500/80 animate-pulse">
            {t('retrieving_manifest')}
          </div>
          <div className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">{t('connecting_to_core')}</div>
        </div>
      </div>
    );
  }

  if (!session) return <div className="text-muted-foreground/60 p-8 font-mono text-xs uppercase tracking-widest">{t('offline')}</div>;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col gap-6">
        <Breadcrumb
          items={[
            { label: tCommon('sidebar.dashboard'), href: `/${locale}/dashboard` },
            { label: t('title'), href: `/${locale}/stocktake` },
            { label: session.session_number },
          ]}
        />

        <PageHeader
          title={
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center border border-white/5 shadow-xl">
                <BarChart3 className="w-6 h-6 text-cyan-500" />
              </div>
              <div className="flex flex-col">
                <span dir="ltr" className="font-display font-black tracking-tighter text-3xl">
                  {session.session_number}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/10 rounded-md border border-cyan-500/20">
                    <Clock className="w-2.5 h-2.5 text-cyan-500" />
                    <span dir="ltr" className="text-[9px] font-black text-cyan-500 tabular-nums uppercase">
                      {format(new Date(session.snapshot_at), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                  <span className="text-muted-foreground/20 text-[10px]">|</span>
                  <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                    {t('snapshot_qty')}
                  </span>
                </div>
              </div>
            </div>
          }
          actions={
            !isPosted && (
              <PermissionGate action="post" resource="stocktake">
                <Button
                  onClick={() => setIsPostDialogOpen(true)}
                  disabled={!allCounted || hasUnresolvedVariances || postStocktake.isPending}
                  className="h-12 px-10 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-20 group"
                >
                  <CheckCircle className="w-4 h-4 me-2 group-hover:scale-110 transition-transform" />
                  {t('post_session')}
                </Button>
              </PermissionGate>
            )
          }
        />
      </div>

      {/* Session Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-container-low/40 p-6 rounded-[2rem] border border-white/5 flex flex-col gap-4 group hover:bg-surface-container-low transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-surface-container-highest/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <Warehouse className="w-5 h-5 text-cyan-500/60" />
            </div>
            <span className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.3em]">{tCommon('warehouse')}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-foreground tracking-tight">
              {tCommon('warehouses.' + session.warehouse_id.toLowerCase())}
            </span>
            <span dir="ltr" className="text-[10px] font-bold text-muted-foreground/40 font-mono tracking-widest">{session.warehouse_id}</span>
          </div>
        </div>

        <div className="bg-surface-container-low/40 p-6 rounded-[2rem] border border-white/5 flex flex-col gap-4 group hover:bg-surface-container-low transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-surface-container-highest/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <Info className="w-5 h-5 text-amber-500/60" />
            </div>
            <span className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.3em]">{tCommon('status_label')}</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex">
              <StatusBadge status={session.status} />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{t('workflow_state')}</span>
          </div>
        </div>

        <div className="bg-surface-container-low/40 p-6 rounded-[2rem] border border-white/5 flex flex-col gap-4 group hover:bg-surface-container-low transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-surface-container-highest/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <User className="w-5 h-5 text-emerald-500/60" />
            </div>
            <span className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.3em]">{t('started_by')}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-foreground tracking-tight uppercase">
              {session.started_by}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{t('owner')}</span>
          </div>
        </div>

        <div className="bg-surface-container-low/40 p-6 rounded-[2rem] border border-white/5 flex flex-col gap-4 group hover:bg-surface-container-low transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-surface-container-highest/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <ChevronRight className="w-5 h-5 text-rose-500/60" />
            </div>
            <span className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.3em]">{t('items_count')}</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span dir="ltr" className="text-3xl font-mono font-black text-foreground">
                {session.counts.length}
              </span>
              <span className="text-[10px] font-bold text-rose-500/50 uppercase tracking-widest">{t('skus')}</span>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{t('total_to_verify')}</span>
          </div>
        </div>
      </div>

      {isActive && (
        <div className="rounded-[2rem] overflow-hidden shadow-2xl">
          <LockBanner lockState={lockState} />
        </div>
      )}

      {/* Count Sheet Interface */}
      <div className="bg-surface-container-low/30 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 end-0 p-8 opacity-[0.02] pointer-events-none">
          <BarChart3 className="w-48 h-48" />
        </div>

        <div className="p-10 border-b border-white/5 bg-surface-container-low/50 flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-2 h-6 bg-cyan-500 rounded-full" />
              <h2 className="text-xs font-black uppercase tracking-[0.4em] text-cyan-500">{t('count_sheet_title')}</h2>
            </div>
            <p className="text-muted-foreground/40 text-[11px] font-bold uppercase tracking-widest ms-5">{t('count_sheet_desc')}</p>
          </div>

          <div className="flex items-center gap-6">
            {hasUnresolvedVariances && (
              <div className="flex items-center gap-3 px-6 py-3 bg-rose-500/5 border border-rose-500/20 rounded-2xl animate-in fade-in zoom-in duration-500">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                <span className="text-rose-400 text-[10px] font-black uppercase tracking-[0.15em]">{t('variance_reason_required')}</span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500/60" />
              </div>
            )}
            <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-highest/20 rounded-xl border border-white/5">
              <Save className="w-3.5 h-3.5 text-muted-foreground/40" />
              <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">{t('autosave_active')}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-high/30 text-muted-foreground/40 text-[9px] uppercase tracking-[0.4em] font-black border-b border-white/5">
                <th className="px-8 py-6 text-start w-40">{t('uid')}</th>
                <th className="px-8 py-6 text-start">{tCommon('item')}</th>
                <th className="px-8 py-6 text-end w-32">{t('snapshot_qty')}</th>
                <th className="px-8 py-6 text-center w-48">{t('counted_qty')}</th>
                <th className="px-8 py-6 text-end w-32">{t('variance')}</th>
                <th className="px-8 py-6 text-start min-w-[300px]">{t('variance_reason')}</th>
                <th className="px-8 py-6 text-center w-24">{t('sync')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {localCounts.map(count => {
                const variance = count.local_counted_qty !== null
                  ? count.local_counted_qty - count.snapshot_qty
                  : null;
                const varianceColor = variance === null ? 'text-muted-foreground/10'
                  : variance < 0 ? 'text-rose-500'
                  : variance > 0 ? 'text-emerald-400'
                  : 'text-muted-foreground/30';
                const needsReason = variance !== null && variance !== 0 && !count.local_variance_reason;

                return (
                  <tr key={count.id} className="hover:bg-surface-container-high/20 transition-all group border-s-4 border-transparent hover:border-cyan-500/40">
                    <td className="px-8 py-7">
                      <span dir="ltr" className="font-mono text-[11px] font-black text-cyan-500/30 group-hover:text-cyan-500 transition-colors tracking-widest">{count.item.code}</span>
                    </td>
                    <td className="px-8 py-7">
                      <div className="flex flex-col gap-1">
                        <div className="font-black text-foreground text-sm tracking-tight leading-none group-hover:text-cyan-500/90 transition-colors">
                          {locale === 'ar' ? count.item.name_ar : count.item.name_en}
                        </div>
                        <div className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.1em]">{count.item.category?.name_en || 'General'}</div>
                      </div>
                    </td>
                    <td className="px-8 py-7 text-end">
                      <div className="flex flex-col items-end gap-1">
                        <span dir="ltr" className="font-mono text-sm font-black text-foreground/40 tabular-nums">
                          {count.snapshot_qty}
                        </span>
                        <span className="text-[8px] font-bold text-muted-foreground/20 uppercase tracking-widest">{t('expected')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-7">
                      {isPosted ? (
                        <div className="flex justify-center">
                          <div className="px-6 py-2 bg-surface-container-highest/20 rounded-xl border border-white/5">
                            <span dir="ltr" className="font-mono text-lg font-black text-cyan-500 tabular-nums">
                              {count.counted_qty ?? '—'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center group/input">
                          <input
                            type="number"
                            min={0}
                            value={count.local_counted_qty ?? ''}
                            onChange={e => {
                              const val = e.target.value === '' ? null : Number(e.target.value);
                              setLocalCounts(prev => prev.map(c => c.id === count.id
                                ? { ...c, local_counted_qty: val, is_saved: false }
                                : c));
                            }}
                            onBlur={() => {
                              if (count.local_counted_qty !== null) {
                                handleCountedQtyBlur(count.id, count.local_counted_qty);
                              }
                            }}
                            dir="ltr"
                            placeholder="0"
                            className="w-32 bg-surface-container-highest/20 border border-white/10 text-foreground rounded-[1.25rem] px-6 py-4 text-center font-mono font-black text-xl focus:ring-4 focus:ring-cyan-500/20 focus:outline-none transition-all group-hover/input:bg-surface-container-highest/40 placeholder:text-muted-foreground/10 group-hover/input:border-cyan-500/30"
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-7 text-end">
                      {variance !== null ? (
                        <div className={`flex flex-col items-end gap-1 ${varianceColor}`}>
                          <span dir="ltr" className="font-mono text-lg font-black tabular-nums transition-all">
                            {variance > 0 ? `+${variance}` : variance}
                          </span>
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-50">{t('delta')}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/10 font-mono text-lg">—</span>
                      )}
                    </td>
                    <td className="px-8 py-7">
                      {!isPosted && variance !== 0 && count.local_counted_qty !== null ? (
                        <div className="relative group/reason">
                          <input
                            type="text"
                            value={count.local_variance_reason}
                            onChange={e => setLocalCounts(prev => prev.map(c => c.id === count.id
                              ? { ...c, local_variance_reason: e.target.value }
                              : c))}
                            placeholder={t('variance_reason')}
                            className={`w-full bg-surface-container-highest/20 border border-white/5 rounded-2xl px-6 py-3 text-[11px] font-bold tracking-wide focus:outline-none focus:ring-4 focus:ring-cyan-500/10 transition-all hover:bg-surface-container-highest/40 placeholder:text-muted-foreground/20 ${needsReason ? 'ring-2 ring-rose-500/30 border-rose-500/40' : ''}`}
                          />
                          {needsReason && (
                            <div className="absolute -top-2 -end-2 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                              <AlertTriangle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="px-2">
                          <span className="text-muted-foreground/20 text-[10px] font-bold uppercase tracking-widest italic">{count.variance_reason || t('no_variance_recorded')}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-7 text-center">
                      <div className="flex items-center justify-center">
                        {count.is_saving ? (
                          <div className="relative w-6 h-6">
                            <div className="absolute inset-0 border-2 border-cyan-500/10 rounded-full" />
                            <div className="absolute inset-0 border-2 border-t-cyan-500 rounded-full animate-spin" />
                          </div>
                        ) : count.is_saved ? (
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 animate-in zoom-in duration-300">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          </div>
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PostConfirmDialog
        open={isPostDialogOpen}
        onOpenChange={setIsPostDialogOpen}
        title={t('post_confirm_title')}
        description={t('post_confirm_desc')}
        warningText={t('post_irreversible') || t('post_confirm_desc')}
        requiresTextConfirmation
        isLoading={postStocktake.isPending}
        onConfirm={handlePost}
      />
    </div>
  );
}
