'use client';

import { use, useState, useEffect } from 'react';
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

type LocalCount = StocktakeCount & {
  local_counted_qty: number | null;
  local_variance_reason: string;
  is_saving: boolean;
  is_saved: boolean;
};

export default function StocktakeDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = use(props.params);
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
      setLocalCounts(session.counts.map(c => ({
        ...c,
        local_counted_qty: c.counted_qty,
        local_variance_reason: c.variance_reason ?? '',
        is_saving: false,
        is_saved: false,
      })));
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
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-surface-3 animate-pulse h-12 rounded" />
        ))}
      </div>
    );
  }

  if (!session) return <div className="text-on-surface-muted p-8">Session not found.</div>;

  return (
    <div className="space-y-6 pb-24">
      <Breadcrumb
        items={[
          { label: tCommon('sidebar.dashboard'), href: `/${locale}/dashboard` },
          { label: t('title'), href: `/${locale}/stocktake` },
          { label: session.session_number },
        ]}
      />

      <PageHeader
        title={session.session_number}
        description={`${t('snapshot_qty')}: ${new Date(session.snapshot_at).toLocaleDateString()}`}
        actions={
          !isPosted && (
            <Button
              onClick={() => setIsPostDialogOpen(true)}
              disabled={!allCounted || hasUnresolvedVariances || postStocktake.isPending}
              className="bg-neon-cyan text-surface-0 hover:bg-neon-cyan/80 disabled:opacity-50"
            >
              {t('post_session')}
            </Button>
          )
        }
      />

      {/* Session Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface-1 p-4 rounded-xl border border-surface-3">
        <div>
          <span className="text-xs text-on-surface-muted block mb-1">Warehouse</span>
          <span className="font-medium">{session.warehouse_id}</span>
        </div>
        <div>
          <span className="text-xs text-on-surface-muted block mb-1">Status</span>
          <StatusBadge status={session.status} />
        </div>
        <div>
          <span className="text-xs text-on-surface-muted block mb-1">Started By</span>
          <span className="font-medium">{session.started_by}</span>
        </div>
        <div>
          <span className="text-xs text-on-surface-muted block mb-1">Items</span>
          <span dir="ltr" className="font-mono font-bold">{session.counts.length}</span>
        </div>
      </div>

      {/* Lock Banner always visible for active sessions */}
      {isActive && <LockBanner lockState={lockState} />}

      {/* Count Sheet */}
      <div className="bg-surface-1 border border-surface-3 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-surface-3">
          <h2 className="font-bold text-on-surface">{t('count_sheet_title')}</h2>
          {hasUnresolvedVariances && (
            <p className="text-neon-amber text-sm mt-1">{t('variance_reason_required')}</p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2 text-on-surface-muted text-xs uppercase tracking-wider">
                <th className="p-3 text-start">Item Code</th>
                <th className="p-3 text-start">Item Name</th>
                <th className="p-3 text-end">{t('snapshot_qty')}</th>
                <th className="p-3 text-end">{t('counted_qty')}</th>
                <th className="p-3 text-end">{t('variance')}</th>
                <th className="p-3 text-start">{t('variance_reason')}</th>
                <th className="p-3 text-center">Saved</th>
              </tr>
            </thead>
            <tbody>
              {localCounts.map(count => {
                const variance = count.local_counted_qty !== null
                  ? count.local_counted_qty - count.snapshot_qty
                  : null;
                const varianceColor = variance === null ? 'text-on-surface-muted'
                  : variance < 0 ? 'text-neon-red'
                  : variance > 0 ? 'text-neon-green'
                  : 'text-on-surface-muted';
                const needsReason = variance !== null && variance !== 0 && !count.local_variance_reason;

                return (
                  <tr key={count.id} className="border-b border-surface-3 hover:bg-surface-2 transition-colors">
                    <td className="p-3">
                      <span dir="ltr" className="font-mono text-on-surface-muted">{count.item.code}</span>
                    </td>
                    <td className="p-3 text-on-surface">
                      {locale === 'ar' ? count.item.name_ar : count.item.name_en}
                    </td>
                    <td className="p-3 text-end">
                      <span dir="ltr" className="font-mono">{count.snapshot_qty}</span>
                    </td>
                    <td className="p-3 text-end">
                      {isPosted ? (
                        <span dir="ltr" className="font-mono">{count.counted_qty ?? '—'}</span>
                      ) : (
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
                          className="w-24 bg-surface-2 border border-surface-3 text-on-surface rounded px-2 py-1 text-center font-mono focus:border-neon-cyan focus:outline-none ms-auto block"
                        />
                      )}
                    </td>
                    <td className={`p-3 text-end font-mono font-bold ${varianceColor}`}>
                      {variance !== null ? (
                        <span dir="ltr">{variance > 0 ? `+${variance}` : variance}</span>
                      ) : '—'}
                    </td>
                    <td className="p-3">
                      {!isPosted && variance !== 0 && count.local_counted_qty !== null ? (
                        <input
                          type="text"
                          value={count.local_variance_reason}
                          onChange={e => setLocalCounts(prev => prev.map(c => c.id === count.id
                            ? { ...c, local_variance_reason: e.target.value }
                            : c))}
                          placeholder={t('variance_reason')}
                          className={`w-full bg-surface-2 border rounded px-2 py-1 text-sm focus:outline-none focus:border-neon-cyan ${needsReason ? 'border-neon-red' : 'border-surface-3'}`}
                        />
                      ) : (
                        <span className="text-on-surface-muted text-xs">{count.variance_reason || '—'}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {count.is_saving && (
                        <span className="text-on-surface-muted text-xs animate-pulse">Saving…</span>
                      )}
                      {count.is_saved && (
                        <span className="text-neon-green text-lg">✓</span>
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
        warningText={t('post_confirm_desc')}
        requiresTextConfirmation
        isLoading={postStocktake.isPending}
        onConfirm={handlePost}
      />
    </div>
  );
}
