'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { useAdjustment, AdjustmentLine } from '@/features/operations/hooks/useAdjustment';
import { useCreateAdjustment } from '@/features/operations/hooks/useCreateAdjustment';
import { useApproveAdjustment } from '@/features/operations/hooks/useApproveAdjustment';
import { usePostAdjustment } from '@/features/operations/hooks/usePostAdjustment';
import { useAuth } from '@/providers/AuthProvider';
import { Can } from '@/components/auth/Can';
import { ArrowUp, ArrowDown, CheckCircle, Send } from 'lucide-react';

const REASON_OPTIONS = ['DAMAGE', 'EXPIRY', 'THEFT', 'COUNTING_ERROR', 'OTHER'] as const;

const REASON_COLOR: Record<string, string> = {
  DAMAGE:        'bg-red-500/15 text-red-500',
  EXPIRY:        'bg-red-500/15 text-red-500',
  THEFT:         'bg-red-500/15 text-red-500',
  COUNTING_ERROR:'bg-amber-500/15 text-amber-400',
  OTHER:         'bg-surface-3 text-muted-foreground',
};

export function AdjustmentDetailClient({ id, locale }: { id: string; locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.adjustment');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user } = useAuth();

  const isNew = id === 'new';
  
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
      const timer = setTimeout(() => {
        setWarehouseId(adjustment.warehouse_id);
        setReason(adjustment.reason);
        setNotes(adjustment.notes ?? '');
        setLines(adjustment.lines);
      }, 0);
      return () => clearTimeout(timer);
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin" />
          <span className="text-2xl font-black text-cyan-500 tracking-tighter">ADJ</span>
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500 animate-pulse">
          {t('retrieving_manifest')}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Breadcrumb 
        items={[
          { label: tCommon('inventory'), href: '#' },
          { label: t('title'), href: `/${locale}/adjustments` },
          { label: isNew ? t('create_new') : (adjustment?.document_number || '...') }
        ]} 
      />
      <PageHeader
        title={isNew ? t('create_new') : t('detail_title')}
        description={!isNew ? <span dir="ltr" className="font-mono text-cyan-500/80 tracking-widest">{adjustment?.document_number}</span> : undefined}
        actions={
          <div className="flex gap-4 items-center">
            {!isNew && <StatusBadge status={adjustmentStatus as BadgeStatus} />}

            {isNew && (
              <Can perform="create" on="adjustment">
                <Button 
                  onClick={handleSaveDraft} 
                  disabled={createAdjustment.isPending}
                  className="bg-surface-container-high hover:bg-surface-container-highest text-foreground border border-white/5 rounded-xl h-11 px-6 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  {t('save_draft')}
                </Button>
              </Can>
            )}

            {isDraft && !isNew && (
              <Can perform="approve" on="adjustment">
                <Button
                  variant="outline"
                  onClick={() => setApproveDialogOpen(true)}
                  disabled={approveAdjustment.isPending}
                  className="bg-surface-container-high hover:bg-surface-container-highest text-foreground border border-white/5 rounded-xl h-11 px-8 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
                >
                  <CheckCircle className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  {t('approve')}
                </Button>
              </Can>
            )}

            {isApproved && (
              <Can perform="post" on="adjustment">
                <Button
                  onClick={() => setPostDialogOpen(true)}
                  disabled={postAdjustment.isPending}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl h-11 px-8 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-900/20"
                >
                  <Send className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  {t('post_adjustment')}
                </Button>
              </Can>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-surface-container-low/50 p-8 rounded-2xl border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500/50 via-cyan-500/20 to-transparent" />

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">{tCommon('warehouse')}</label>
          <div className="relative group">
            <select
              value={warehouseId}
              onChange={e => setWarehouseId(e.target.value)}
              disabled={!isNew}
              className="w-full bg-surface-container-highest/40 border border-white/5 rounded-xl p-4 font-bold text-sm focus:ring-2 focus:ring-cyan-500/30 transition-all outline-none appearance-none disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed group-hover:bg-surface-container-highest/60"
            >
              <option value="wh-1" className="bg-surface-container-highest text-foreground font-medium">{tCommon('warehouses.main')}</option>
              <option value="wh-2" className="bg-surface-container-highest text-foreground font-medium">{tCommon('warehouses.dry')}</option>
              <option value="wh-3" className="bg-surface-container-highest text-foreground font-medium">{tCommon('warehouses.cold')}</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">{t('reason')}</label>
          <div className="relative group">
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              disabled={!isNew}
              className={`w-full border border-white/5 rounded-xl p-4 font-black text-sm transition-all outline-none focus:ring-2 focus:ring-cyan-500/30 appearance-none disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed ${REASON_COLOR[reason] ?? 'bg-surface-container-highest/40 group-hover:bg-surface-container-highest/60'}`}
            >
              {REASON_OPTIONS.map(r => (
                <option key={r} value={r} className="bg-surface-container-highest text-foreground font-medium">
                  {t(`reasons.${r.toLowerCase()}`)}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
            </div>
          </div>
        </div>

        {adjustment?.approved_by && (
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">{t('approved_by')}</label>
            <div className="bg-surface-container-highest/30 border border-white/5 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-400/90">{adjustment.approved_by}</span>
            </div>
          </div>
        )}

        <div className="col-span-1 md:col-span-3 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">{tCommon('notes')}</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={!isNew}
            placeholder={t('notes_placeholder')}
            className="w-full bg-surface-container-highest/40 border border-white/5 rounded-xl p-4 font-medium text-sm focus:ring-2 focus:ring-cyan-500/30 transition-all outline-none resize-none min-h-[100px] hover:bg-surface-container-highest/60"
            rows={2}
          />
        </div>
      </div>

      <div className="bg-surface-container-low/30 rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <DocumentReadOnlyOverlay isPosted={isPosted}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-high/50 text-muted-foreground/60 text-[10px] uppercase tracking-[0.3em] font-black border-b border-white/5">
                  <th className="text-start px-6 py-5">{tCommon('item')}</th>
                  <th className="text-center px-6 py-5">{t('direction')}</th>
                  <th className="text-center px-6 py-5">{t('qty_before')}</th>
                  <th className="text-center px-6 py-5">{t('qty_adjusted')}</th>
                  <th className="text-start px-6 py-5">{t('reason_notes')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-muted-foreground/40 font-mono text-xs tracking-widest italic">
                      {tCommon('no_items') || 'NO CALIBRATION DATA'}
                    </td>
                  </tr>
                )}
                {lines.map(line => (
                  <tr key={line.id} className="hover:bg-surface-container-high/40 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="font-bold text-foreground/90">{locale === 'ar' ? line.item.name_ar : line.item.name_en}</div>
                      <div className="text-[10px] text-cyan-500/40 font-mono tracking-widest mt-1 group-hover:text-cyan-500/60 transition-colors">{line.item.code}</div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {line.direction === 'INCREASE' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                          <ArrowUp className="w-3 h-3" />
                          {t('direction_increase')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(255,49,49,0.05)]">
                          <ArrowDown className="w-3 h-3" />
                          {t('direction_decrease')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span dir="ltr" className="font-mono text-sm font-bold bg-surface-container-highest/50 px-3 py-1.5 rounded-lg border border-white/5 opacity-40">
                        {line.qty_before}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span dir="ltr" className={`font-mono text-base font-black px-4 py-2 rounded-xl border ${line.direction === 'INCREASE' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' : 'bg-red-500/5 text-red-500 border-red-500/20'}`}>
                        {line.direction === 'INCREASE' ? '+' : '−'}{line.qty_adjusted}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-muted-foreground/60 text-xs italic">
                      {line.reason_notes ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DocumentReadOnlyOverlay>
      </div>

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
