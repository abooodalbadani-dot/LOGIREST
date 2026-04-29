'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { useAdjustment, AdjustmentLine } from '@/features/operations/hooks/useAdjustment';
import { useCreateAdjustment } from '@/features/operations/hooks/useCreateAdjustment';
import { useApproveAdjustment } from '@/features/operations/hooks/useApproveAdjustment';
import { usePostAdjustment } from '@/features/operations/hooks/usePostAdjustment';
import { useAuth } from '@/providers/AuthProvider';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { LockBanner } from '@/components/shared/LockBanner';
import { ArrowUp, ArrowDown, CheckCircle, Send, AlertCircle, Trash2, Package } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

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

  const isNew = id === 'new';
  
  const { data: adjustment, isLoading } = useAdjustment(isNew ? null : id);
  const createAdjustment = useCreateAdjustment();
  const approveAdjustment = useApproveAdjustment(id);
  const postAdjustment = usePostAdjustment();

  const adjustmentStatus = adjustment?.status ?? 'DRAFT';
  const isPosted = adjustmentStatus === 'POSTED';
  const isDraft = adjustmentStatus === 'DRAFT';
  const isApproved = adjustmentStatus === 'APPROVED';

  const [warehouseId, setWarehouseId] = useState('wh-1');
  const { data: lockState } = useWarehouseLock(warehouseId);
  const [reason, setReason] = useState<string>('DAMAGE');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<AdjustmentLine[]>([]);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [scanError, setScanError] = useState('');

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
  
  // Refresh stock levels when warehouse changes
  useEffect(() => {
    if ((isNew || isDraft) && lines.length > 0) {
      const refreshStock = async () => {
        const BalanceSchema = z.object({
          data: z.array(z.object({
            qty_on_hand: z.number()
          }))
        });
        
        const updatedLines = await Promise.all(lines.map(async (line) => {
          try {
            const balanceRes = await apiClient.get(
              `/inventory/balance?warehouse_id=${warehouseId}&search=${line.item.code}`, 
              BalanceSchema
            );
            const currentQty = balanceRes.data?.[0]?.qty_on_hand ?? 0;
            return { ...line, qty_before: currentQty };
          } catch {
            return line;
          }
        }));
        
        // Only update if something actually changed to avoid infinite loops
        const hasChanged = updatedLines.some((l, i) => l.qty_before !== lines[i].qty_before);
        if (hasChanged) {
          setLines(updatedLines);
        }
      };
      
      refreshStock();
    }
  }, [warehouseId, isNew, isDraft]);


  const handleSaveDraft = async () => {
    if (lines.length === 0) return;
    try {
      await createAdjustment.mutateAsync({
        warehouse_id: warehouseId,
        reason,
        notes,
        lines: lines.map(l => ({
          item_id: l.item.id,
          qty: l.qty_adjusted,
          uom_id: l.uom_id,
          direction: l.direction
        }))
      });
      router.push(`/${locale}/adjustments`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleScan = async (barcode: string) => {
    if (!!lockState?.is_locked) return;
    try {
      setScanError('');
      const ItemSchema = z.object({
        data: z.array(z.object({
          id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string(),
          primary_uom: z.object({ id: z.string(), code: z.string() })
        }))
      });
      const res = await apiClient.get(`/master-data/items?barcode=${barcode}`, ItemSchema);
      
      if (res.data && res.data.length > 0) {
        const item = res.data[0];
        
        // Fetch current stock balance
        const BalanceSchema = z.object({
          data: z.array(z.object({
            qty_on_hand: z.number()
          }))
        });
        const balanceRes = await apiClient.get(`/inventory/balance?warehouse_id=${warehouseId}&search=${item.code}`, BalanceSchema);
        const currentQty = balanceRes.data?.[0]?.qty_on_hand ?? 0;

        setLines(prev => {
          const existing = prev.find(l => l.item.id === item.id);
          if (existing) {
            return prev.map(l => l.item.id === item.id ? { ...l, qty_adjusted: l.qty_adjusted + 1, qty_before: currentQty } : l);
          }
          return [...prev, {
            id: `new-${Date.now()}`,
            item: {
              ...item,
              name_ar: item.name_ar,
              name_en: item.name_en,
              primary_uom: item.primary_uom
            },
            direction: 'INCREASE',
            qty_before: currentQty,
            qty_adjusted: 1,
            uom_id: item.primary_uom.id,
            reason_notes: ''
          }];
        });
      } else {
        setScanError(tCommon('not_found'));
      }
    } catch {
      setScanError(tCommon('error'));
    }
  };

  const removeLine = (id: string) => {
    if (!!lockState?.is_locked) return;
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const updateLine = (id: string, updates: Partial<AdjustmentLine>) => {
    if (!!lockState?.is_locked) return;
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const handleApprove = async () => {
    if (!!lockState?.is_locked) return;
    try {
      await approveAdjustment.mutateAsync();
      setApproveDialogOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePost = async () => {
    if (!!lockState?.is_locked) return;
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
        <div className={cn("text-[10px] font-black uppercase text-cyan-500 animate-pulse", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>
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
        description={!isNew ? <span dir="ltr" className={cn("font-mono text-cyan-500/80", locale === 'ar' ? "tracking-normal" : "tracking-[0.08em]")}>{adjustment?.document_number}</span> : undefined}
        status={adjustment?.status}
        showStatus={!isNew}
        actions={
          <div className="flex gap-4 items-center">

            {isNew && (
              <PermissionGate action="create" resource="adjustment">
                <Button 
                  onClick={handleSaveDraft} 
                  disabled={createAdjustment.isPending || !!lockState?.is_locked || notes.trim().length < 10 || lines.length === 0}
                  className={cn("bg-surface-container-high hover:bg-surface-container-highest text-foreground rounded-xl h-11 px-6 text-[10px] font-black uppercase transition-all disabled:opacity-50", locale === 'ar' ? "tracking-normal" : "tracking-[0.08em]")}
>
                  {t('save_draft')}
                </Button>
              </PermissionGate>
            )}

            {isDraft && !isNew && (
              <PermissionGate action="approve" resource="adjustment">
                <Button
                  variant="outline"
                  onClick={() => setApproveDialogOpen(true)}
                  disabled={approveAdjustment.isPending || !!lockState?.is_locked}
                  className={cn("bg-surface-container-high hover:bg-surface-container-highest text-foreground rounded-xl h-11 px-8 text-[10px] font-black uppercase transition-all", locale === 'ar' ? "tracking-normal" : "tracking-[0.08em]")}
                >
                  <CheckCircle className="w-4 h-4 me-2" />
                  {t('approve')}
                </Button>
              </PermissionGate>
            )}

            {isApproved && (
              <PermissionGate action="post" resource="adjustment">
                <Button
                  onClick={() => setPostDialogOpen(true)}
                  disabled={postAdjustment.isPending || !!lockState?.is_locked}
                  className={cn("bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl h-11 px-8 text-[10px] font-black uppercase transition-all shadow-lg", locale === 'ar' ? "tracking-normal" : "tracking-[0.08em]")}
                >
                  <Send className="w-4 h-4 me-2" />
                  {t('post_adjustment')}
                </Button>
              </PermissionGate>
            )}
          </div>
        }
      />

      <LockBanner lockState={lockState} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-surface-container-low/50 p-8 rounded-[2rem] relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-e from-cyan-500/50 via-cyan-500/20 to-transparent" />

        <div className="space-y-2">
          <label className={cn("text-[10px] font-black uppercase text-muted-foreground/60 ms-1", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>{tCommon('warehouse')}</label>
          <Select
            value={warehouseId}
            onValueChange={(val) => val && setWarehouseId(val)}
            disabled={(!isDraft && !isNew) || !!lockState?.is_locked}
          >
            <SelectTrigger className="w-full bg-surface-container-highest/40 rounded-xl h-[52px] font-bold text-sm hover:bg-surface-container-highest/60 transition-all">
              <SelectValue placeholder={tCommon('warehouse')} />
            </SelectTrigger>
            <SelectContent className="bg-surface-container-highest rounded-xl shadow-2xl border-none">
              <SelectItem value="wh-1" className="font-medium focus:bg-cyan-500/10 focus:text-cyan-400">{tCommon('warehouses.main')}</SelectItem>
              <SelectItem value="wh-2" className="font-medium focus:bg-cyan-500/10 focus:text-cyan-400">{tCommon('warehouses.dry')}</SelectItem>
              <SelectItem value="wh-3" className="font-medium focus:bg-cyan-500/10 focus:text-cyan-400">{tCommon('warehouses.cold')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className={cn("text-[10px] font-black uppercase text-muted-foreground/60 ms-1", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>{t('reason')}</label>
          <Select
            value={reason}
            onValueChange={(val) => val && setReason(val)}
            disabled={(!isDraft && !isNew) || !!lockState?.is_locked}
          >
            <SelectTrigger className={cn(`w-full rounded-xl h-[52px] font-black text-sm transition-all`, REASON_COLOR[reason] ?? 'bg-surface-container-highest/40')}>
              <SelectValue placeholder={t('reason')} />
            </SelectTrigger>
            <SelectContent className="bg-surface-container-highest rounded-xl shadow-2xl border-none">
              {REASON_OPTIONS.map(r => (
                <SelectItem key={r} value={r} className="font-medium focus:bg-cyan-500/10 focus:text-cyan-400">
                  {t(`reasons.${r.toLowerCase()}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {adjustment?.approved_by && (
          <div className="space-y-2">
            <label className={cn("text-[10px] font-black uppercase text-muted-foreground/60 ms-1", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>{t('approved_by')}</label>
            <div className="bg-surface-container-highest/30 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-400/90">{adjustment.approved_by}</span>
            </div>
          </div>
        )}

        <div className="col-span-1 md:col-span-3 space-y-2">
          <label className={cn("text-[10px] font-black uppercase text-muted-foreground/60 ms-1", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>{tCommon('notes')}</label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={(!isDraft && !isNew) || !!lockState?.is_locked}
            placeholder={t('notes_placeholder')}
            className="w-full bg-surface-container-highest/40 rounded-xl p-4 font-medium text-sm border-none focus:bg-primary-fixed-dim/10 transition-all outline-none shadow-none ring-0 focus-visible:ring-0 resize-none min-h-[100px] hover:bg-surface-container-highest/60"
            rows={2}
          />
        </div>
      </div>
      
      {isNew && !isPosted && (
        <div className="bg-surface-container-low p-8 rounded-[2rem] space-y-6">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-cyan-500" />
            <h3 className={cn("text-[11px] font-black uppercase text-foreground/80", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>{t('add_item')}</h3>
          </div>
          <ScanInput 
            onScan={handleScan}
            placeholder={t('scan_placeholder') || 'Scan item barcode...'}
            disabled={!!lockState?.is_locked}
          />
          {scanError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-xl text-[10px] font-bold text-red-500 uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" />
              {scanError}
            </div>
          )}
        </div>
      )}

      <div className="bg-surface-container-low/30 rounded-[2.5rem] overflow-hidden relative">
        <DocumentReadOnlyOverlay isPosted={isPosted}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={cn("bg-surface-container-high/30 text-muted-foreground/60 text-[11px] uppercase font-bold", locale === 'ar' ? "tracking-normal" : "tracking-[0.08em]")}>
                  <th className="text-start px-8 h-14">{tCommon('item')}</th>
                  <th className="text-center px-6 h-14">{t('direction')}</th>
                  <th className="text-center px-6 h-14">{t('qty_before')}</th>
                  <th className="text-center px-6 h-14">{t('qty_adjusted')}</th>
                  <th className="text-center px-6 h-14">{t('qty_after')}</th>
                  <th className="text-start px-6 h-14 pe-8">{t('reason_notes')}</th>
                </tr>
              </thead>
              <tbody className="divide-none">
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={6} className={cn("text-center py-16 text-muted-foreground/40 font-mono text-xs italic bg-surface-container-lowest", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>
                      {tCommon('no_items') || 'NO CALIBRATION DATA'}
                    </td>
                  </tr>
                )}
                {lines.map((line, idx) => (
                  <tr key={line.id} className={`transition-all h-14 ${idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/60'} hover:bg-primary/[0.04] group`}>
                    <td className="px-8">
                      <div className="font-bold text-foreground/90 text-[14px]">{locale === 'ar' ? line.item.name_ar : line.item.name_en}</div>
                      <div dir="ltr" className={cn("text-[10px] text-cyan-500/40 font-mono mt-0.5 group-hover:text-cyan-500/60 transition-colors text-start", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>{line.item.code}</div>
                    </td>
                    <td className="px-6 text-center">
                      {isPosted ? (
                        line.direction === 'INCREASE' ? (
                          <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border-none shadow-none", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>
                            <ArrowUp className="w-3 h-3" />
                            {t('direction_increase')}
                          </span>
                        ) : (
                          <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-red-500/10 text-red-500 border-none shadow-none", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>
                            <ArrowDown className="w-3 h-3" />
                            {t('direction_decrease')}
                          </span>
                        )
                      ) : (
                        <div className="flex justify-center">
                          <Select
                            value={line.direction}
                            onValueChange={(val) => updateLine(line.id, { direction: val as 'INCREASE' | 'DECREASE' })}
                            disabled={!!lockState?.is_locked}
                          >
                            <SelectTrigger className={cn("w-[140px] h-9 rounded-lg bg-surface-container-high/50 text-[10px] font-black uppercase", locale === 'ar' ? "tracking-normal" : "tracking-[0.08em]")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-surface-container-highest rounded-xl border-none">
                              <SelectItem value="INCREASE" className={cn("text-[10px] font-black uppercase text-emerald-400 focus:bg-emerald-500/10", locale === 'ar' ? "tracking-normal" : "tracking-[0.08em]")}>{t('direction_increase')}</SelectItem>
                              <SelectItem value="DECREASE" className={cn("text-[10px] font-black uppercase text-red-500 focus:bg-red-500/10", locale === 'ar' ? "tracking-normal" : "tracking-[0.08em]")}>{t('direction_decrease')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </td>
                    <td className="px-6 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span dir="ltr" className="font-mono text-[14px] font-bold text-foreground/40 tabular-nums">
                          {line.qty_before.toFixed(3)}
                        </span>
                        <span className="text-[9px] font-black uppercase text-muted-foreground/30 tracking-tighter">{line.item.primary_uom.code}</span>
                      </div>
                    </td>
                    <td className="px-6 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        {isPosted ? (
                          <span dir="ltr" className={`font-mono text-[16px] font-black ${line.direction === 'INCREASE' ? 'text-emerald-400' : 'text-red-500'}`}>
                            {line.direction === 'INCREASE' ? '+' : '−'}{line.qty_adjusted.toFixed(3)}
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-mono text-lg font-bold text-foreground/50">{line.direction === 'INCREASE' ? '+' : '−'}</span>
                            <input 
                              type="number"
                              dir="ltr"
                              min="0"
                              step="0.001"
                              value={line.qty_adjusted}
                              onChange={e => updateLine(line.id, { qty_adjusted: Number(e.target.value) })}
                              disabled={(!isDraft && !isNew) || !!lockState?.is_locked}
                              className="w-24 bg-surface-container-highest/50 rounded-lg px-3 py-2 font-mono text-[16px] font-black text-center border-none focus:bg-primary-fixed-dim/10 transition-all outline-none shadow-none ring-0 focus-visible:ring-0"
                            />
                          </div>
                        )}
                        <span className="text-[9px] font-black uppercase text-muted-foreground/30 tracking-tighter">{line.item.primary_uom.code}</span>
                      </div>
                    </td>
                    <td className="px-6 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span dir="ltr" className={cn(
                          "font-mono text-[14px] font-bold",
                          (line.direction === 'INCREASE' ? line.qty_before + line.qty_adjusted : line.qty_before - line.qty_adjusted) < 0 
                            ? "text-red-500" 
                            : "text-foreground/70"
                        )}>
                          {(line.direction === 'INCREASE' ? line.qty_before + line.qty_adjusted : line.qty_before - line.qty_adjusted).toFixed(3)}
                        </span>
                        <span className="text-[9px] font-black uppercase text-muted-foreground/30 tracking-tighter">{line.item.primary_uom.code}</span>
                      </div>
                    </td>
                    <td className="px-6">
                      {isPosted ? (
                        <div className="text-muted-foreground/60 text-xs italic">
                          {line.reason_notes ?? '—'}
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <input 
                            type="text"
                            value={line.reason_notes || ''}
                            onChange={e => updateLine(line.id, { reason_notes: e.target.value })}
                            disabled={!!lockState?.is_locked}
                            placeholder={t('reason_notes_placeholder') || 'Line reason...'}
                            className="flex-1 bg-transparent py-1 text-xs outline-none transition-all italic text-muted-foreground/80 focus-visible:bg-primary-fixed-dim/10 disabled:opacity-50"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeLine(line.id)}
                            disabled={!!lockState?.is_locked}
                            className="h-8 w-8 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
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
