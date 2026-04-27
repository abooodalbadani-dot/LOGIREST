'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LockBanner } from '@/components/shared/LockBanner';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { Button } from '@/components/ui/button';
import { useStocktakeSession } from '@/features/operations/hooks/useStocktakeSession';
import { useUpdateCount } from '@/features/operations/hooks/useUpdateCount';
import { usePostStocktake } from '@/features/operations/hooks/usePostStocktake';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import type { StocktakeCount } from '@/features/operations/hooks/useStocktakeSession';
import { format } from 'date-fns';
import { CheckCircle } from 'lucide-react';

type LocalCount = StocktakeCount & {
  local_counted_qty: number | null;
  local_variance_reason: string;
  is_saving: boolean;
  is_saved: boolean;
};

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_15px_rgba(6,182,212,0.2)]" />
          <span className="text-2xl font-black text-cyan-500 tracking-tighter italic">STK</span>
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500/80 animate-pulse">
          {t('retrieving_manifest')}
        </div>
      </div>
    );
  }

  if (!session) return <div className="text-on-surface-muted p-8 font-mono text-xs uppercase tracking-widest">{t('offline')}</div>;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Breadcrumb
        items={[
          { label: tCommon('sidebar.dashboard'), href: `/${locale}/dashboard` },
          { label: t('title'), href: `/${locale}/stocktake` },
          { label: session.session_number },
        ]}
      />

      <PageHeader
        title={<span dir="ltr" className="font-mono">{session.session_number}</span>}
        description={
          <div className="flex items-center gap-4 mt-1">
            <span dir="ltr" className="font-mono text-cyan-500/80 tracking-widest">{t('snapshot_qty')}: {format(new Date(session.snapshot_at), 'MMM dd, yyyy HH:mm')}</span>
          </div>
        }
        actions={
          !isPosted && (
            <Button
              onClick={() => setIsPostDialogOpen(true)}
              disabled={!allCounted || hasUnresolvedVariances || postStocktake.isPending}
              className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all shadow-lg shadow-cyan-900/20 disabled:opacity-30"
            >
              <CheckCircle className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('post_session')}
            </Button>
          )
        }
      />

      {/* Session Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 bg-surface-container-low/50 p-8 rounded-2xl border border-white/5 relative overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.1)]">
        {/* Subtle accent line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500/50 via-cyan-500/20 to-transparent" />

        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">{tCommon('warehouse')}</span>
          <div className="font-bold text-foreground text-sm flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/40" />
            {tCommon('warehouses.' + session.warehouse_id.toLowerCase())}
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">{tCommon('status_label')}</span>
          <div className="flex">
            <StatusBadge status={session.status} />
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">{t('started_by')}</span>
          <div className="font-bold text-foreground text-sm uppercase tracking-wide">{session.started_by}</div>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">{t('items_count')}</span>
          <div dir="ltr" className="font-mono font-black text-xl text-cyan-500">{session.counts.length}</div>
        </div>
      </div>

      {/* Lock Banner always visible for active sessions */}
      {isActive && (
        <div className="rounded-2xl overflow-hidden shadow-lg">
          <LockBanner lockState={lockState} />
        </div>
      )}

      {/* Count Sheet */}
      <div className="bg-surface-container-low/30 rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 bg-surface-container-low/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500">{t('count_sheet_title')}</h2>
            <p className="text-muted-foreground/40 text-xs font-medium">{t('count_sheet_desc')}</p>
          </div>
          {hasUnresolvedVariances && (
            <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-rose-400 text-[10px] font-black uppercase tracking-widest">{t('variance_reason_required')}</span>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-high/50 text-muted-foreground/60 text-[10px] uppercase tracking-[0.3em] font-black border-b border-white/5">
                <th className="px-6 py-5 text-start">{t('uid')}</th>
                <th className="px-6 py-5 text-start">{tCommon('item')}</th>
                <th className="px-6 py-5 text-end">{t('snapshot_qty')}</th>
                <th className="px-6 py-5 text-end">{t('counted_qty')}</th>
                <th className="px-6 py-5 text-end">{t('variance')}</th>
                <th className="px-6 py-5 text-start min-w-[200px]">{t('variance_reason')}</th>
                <th className="px-6 py-5 text-center w-24">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {localCounts.map(count => {
                const variance = count.local_counted_qty !== null
                  ? count.local_counted_qty - count.snapshot_qty
                  : null;
                const varianceColor = variance === null ? 'text-muted-foreground/20'
                  : variance < 0 ? 'text-rose-500'
                  : variance > 0 ? 'text-emerald-400'
                  : 'text-muted-foreground/40';
                const needsReason = variance !== null && variance !== 0 && !count.local_variance_reason;

                return (
                  <tr key={count.id} className="hover:bg-surface-container-high/40 transition-colors group">
                    <td className="px-6 py-5">
                      <span dir="ltr" className="font-mono text-[10px] text-cyan-500/40 group-hover:text-cyan-500/60 tracking-widest transition-colors">{count.item.code}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-foreground/90">{locale === 'ar' ? count.item.name_ar : count.item.name_en}</div>
                    </td>
                    <td className="px-6 py-5 text-end">
                      <span dir="ltr" className="font-mono text-sm font-bold opacity-40 bg-surface-container-highest/30 px-2 py-1 rounded border border-white/5">{count.snapshot_qty}</span>
                    </td>
                    <td className="px-6 py-5 text-end">
                      {isPosted ? (
                        <span dir="ltr" className="font-mono text-sm font-black text-cyan-500">{count.counted_qty ?? '—'}</span>
                      ) : (
                        <div className="flex justify-end">
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
                            className="w-24 bg-surface-container-highest/30 border border-white/5 text-foreground rounded-xl px-4 py-2 text-center font-mono font-black text-sm focus:ring-2 focus:ring-cyan-500/30 focus:outline-none transition-all hover:bg-surface-container-highest/60"
                          />
                        </div>
                      )}
                    </td>
                    <td className={`px-6 py-5 text-end font-mono text-base font-black ${varianceColor}`}>
                      {variance !== null ? (
                        <span dir="ltr">{variance > 0 ? `+${variance}` : variance}</span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-5">
                      {!isPosted && variance !== 0 && count.local_counted_qty !== null ? (
                        <div className="relative group/input">
                          <input
                            type="text"
                            value={count.local_variance_reason}
                            onChange={e => setLocalCounts(prev => prev.map(c => c.id === count.id
                              ? { ...c, local_variance_reason: e.target.value }
                              : c))}
                            placeholder={t('variance_reason')}
                            className={`w-full bg-surface-container-highest/40 border border-white/5 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all hover:bg-surface-container-highest/60 ${needsReason ? 'ring-2 ring-rose-500/50' : ''}`}
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs italic">{count.variance_reason || '—'}</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      {count.is_saving ? (
                        <div className="flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                        </div>
                      ) : count.is_saved ? (
                        <div className="flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-emerald-400 animate-in zoom-in duration-300" />
                        </div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-white/5 mx-auto" />
                      )}
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
