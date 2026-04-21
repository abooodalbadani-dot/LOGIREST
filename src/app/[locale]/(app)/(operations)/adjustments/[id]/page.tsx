'use client';

import { use, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { useAdjustment, AdjustmentLine } from '@/features/operations/hooks/useAdjustment';
import { useCreateAdjustment } from '@/features/operations/hooks/useCreateAdjustment';
import { useApproveAdjustment } from '@/features/operations/hooks/useApproveAdjustment';
import { usePostAdjustment } from '@/features/operations/hooks/usePostAdjustment';
import { useAuth } from '@/providers/AuthProvider';
import { ArrowUp, ArrowDown, CheckCircle, Send } from 'lucide-react';

const REASON_OPTIONS = ['DAMAGE', 'EXPIRY', 'THEFT', 'COUNTING_ERROR', 'OTHER'] as const;

const REASON_COLOR: Record<string, string> = {
  DAMAGE:        'bg-neon-red/15 text-neon-red',
  EXPIRY:        'bg-neon-red/15 text-neon-red',
  THEFT:         'bg-neon-red/15 text-neon-red',
  COUNTING_ERROR:'bg-amber-500/15 text-amber-400',
  OTHER:         'bg-surface-3 text-muted-foreground',
};

export default function AdjustmentDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = use(props.params);
  const { locale, id } = params;
  const t = useTranslations('operations.adjustment');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user } = useAuth();

  const isNew = id === 'new';
  const canApproveOrPost = user?.role === 'ADMIN' || user?.role === 'INV_MGR';

  const { data: adjustment, isLoading } = useAdjustment(isNew ? null : id);
  const createAdjustment = useCreateAdjustment();
  const approveAdjustment = useApproveAdjustment(id);
  const postAdjustment = usePostAdjustment();

  const [warehouseId, setWarehouseId] = useState('wh-1');
  const [reason, setReason] = useState<string>('DAMAGE');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<AdjustmentLine[]>([]);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);

  useEffect(() => {
    if (adjustment) {
      setWarehouseId(adjustment.warehouse_id);
      setReason(adjustment.reason);
      setNotes(adjustment.notes ?? '');
      setLines(adjustment.lines);
    }
  }, [adjustment]);

  const adjustmentStatus = adjustment?.status ?? 'DRAFT';
  const isPosted = adjustmentStatus === 'POSTED';
  const isDraft = adjustmentStatus === 'DRAFT';
  const isApproved = adjustmentStatus === 'APPROVED';

  const handleSaveDraft = async () => {
    try {
      await createAdjustment.mutateAsync({
        warehouse_id: warehouseId,
        reason,
        notes,
        lines: []
      });
      router.push(`/${locale}/adjustments`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async () => {
    try {
      await approveAdjustment.mutateAsync();
      setApproveDialogOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePost = async () => {
    try {
      await postAdjustment.mutateAsync(id);
      setPostDialogOpen(false);
      router.push(`/${locale}/adjustments`);
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title={isNew ? t('create_new') : t('detail_title') + ' – ' + (adjustment?.document_number ?? '')}
        actions={
          <div className="flex gap-2 items-center">
            {!isNew && <StatusBadge status={adjustmentStatus as any} />}

            {/* Save draft — only for new */}
            {isNew && (
              <Button onClick={handleSaveDraft} disabled={createAdjustment.isPending}>
                {t('save_draft')}
              </Button>
            )}

            {/* Approve — DRAFT + INV_MGR+ */}
            {isDraft && !isNew && canApproveOrPost && (
              <Button
                variant="outline"
                onClick={() => setApproveDialogOpen(true)}
                disabled={approveAdjustment.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t('approve')}
              </Button>
            )}

            {/* Post — APPROVED + INV_MGR+ */}
            {isApproved && canApproveOrPost && (
              <Button
                onClick={() => setPostDialogOpen(true)}
                disabled={postAdjustment.isPending}
              >
                <Send className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t('post_adjustment')}
              </Button>
            )}
          </div>
        }
      />

      {/* Header fields */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-surface-1 p-4 rounded-lg border border-surface-3">
        <div>
          <label className="text-sm text-muted-foreground block mb-1">{tCommon('warehouse')}</label>
          <select
            value={warehouseId}
            onChange={e => setWarehouseId(e.target.value)}
            disabled={!isNew}
            className="w-full bg-surface-2 border border-surface-3 rounded p-2"
          >
            <option value="wh-1">Warehouse 1 (Main)</option>
            <option value="wh-2">Warehouse 2 (Dry)</option>
            <option value="wh-3">Warehouse 3 (Cold)</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">{t('reason')}</label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            disabled={!isNew}
            className={`w-full border border-surface-3 rounded p-2 ${REASON_COLOR[reason] ?? 'bg-surface-2'}`}
          >
            {REASON_OPTIONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        {adjustment?.approved_by && (
          <div>
            <label className="text-sm text-muted-foreground block mb-1">{t('approved_by')}</label>
            <div className="py-2 text-sm font-medium">{adjustment.approved_by}</div>
          </div>
        )}
        <div className="col-span-2 md:col-span-3">
          <label className="text-sm text-muted-foreground block mb-1">{tCommon('notes')}</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={!isNew}
            className="w-full bg-surface-2 border border-surface-3 rounded p-2"
            rows={2}
          />
        </div>
      </div>

      {/* Line items */}
      <DocumentReadOnlyOverlay isPosted={isPosted}>
        <div className="bg-surface-1 rounded-lg border border-surface-3 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-2 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-start px-4 py-3">{tCommon('item')}</th>
                <th className="text-center px-4 py-3">{t('direction')}</th>
                <th className="text-center px-4 py-3">{t('qty_before')}</th>
                <th className="text-center px-4 py-3">{t('qty_adjusted')}</th>
                <th className="text-start px-4 py-3">{t('reason_notes')}</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    {tCommon('no_items')}
                  </td>
                </tr>
              )}
              {lines.map(line => (
                <tr key={line.id} className="border-b border-surface-3 hover:bg-surface-2/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{locale === 'ar' ? line.item.name_ar : line.item.name_en}</div>
                    <div className="text-xs text-muted-foreground font-mono">{line.item.code}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {line.direction === 'INCREASE' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">
                        <ArrowUp className="w-3 h-3" />
                        {t('direction_increase')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-neon-red/15 text-neon-red">
                        <ArrowDown className="w-3 h-3" />
                        {t('direction_decrease')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span dir="ltr" className="font-mono">{line.qty_before}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span dir="ltr" className={`font-mono font-semibold ${line.direction === 'INCREASE' ? 'text-emerald-400' : 'text-neon-red'}`}>
                      {line.direction === 'INCREASE' ? '+' : '−'}{line.qty_adjusted}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">
                    {line.reason_notes ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocumentReadOnlyOverlay>

      {/* Approve dialog */}
      <PostConfirmDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        title={t('approve_confirm_title')}
        description={t('approve_confirm_desc')}
        warningText=""
        requiresTextConfirmation={false}
        onConfirm={handleApprove}
        isLoading={approveAdjustment.isPending}
      />

      {/* Post dialog */}
      <PostConfirmDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        title={t('post_confirm_title')}
        description={t('post_confirm_desc')}
        warningText={t('post_irreversible')}
        requiresTextConfirmation={true}
        onConfirm={handlePost}
        isLoading={postAdjustment.isPending}
      />
    </div>
  );
}
