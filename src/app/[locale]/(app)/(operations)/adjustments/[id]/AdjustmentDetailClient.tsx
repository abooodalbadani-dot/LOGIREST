'use client';

import { useState, useEffect, useMemo } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { useAdjustment, AdjustmentLine } from '@/features/operations/hooks/useAdjustment';
import { useCreateAdjustment } from '@/features/operations/hooks/useCreateAdjustment';
import { useApproveAdjustment } from '@/features/operations/hooks/useApproveAdjustment';
import { usePostAdjustment } from '@/features/operations/hooks/usePostAdjustment';
import { useSubmitAdjustment } from '@/features/operations/hooks/useSubmitAdjustment';
import { useRejectAdjustment } from '@/features/operations/hooks/useRejectAdjustment';
import { useUpdateAdjustment } from '@/features/operations/hooks/useUpdateAdjustment';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { StatusTimeline, Status } from '@/components/shared/StatusTimeline';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatQuantity } from '@/lib/utils';
import { 
 ArrowUp, 
 ArrowDown, 
 ArrowLeft,
 CheckCircle, 
 Trash2, 
 Package, 
 XCircle, 
 History,
 Info,
 Clock,
 AlertCircle
} from 'lucide-react';
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
import { 
 Dialog, 
 DialogContent, 
 DialogHeader, 
 DialogTitle, 
 DialogDescription,
 DialogFooter
} from "@/components/ui/dialog";
import { StatusBadge } from '@/components/shared/StatusBadge';

const REASON_OPTIONS = ['DAMAGE', 'EXPIRY', 'THEFT', 'COUNTING_ERROR', 'CORRECTION', 'OTHER'] as const;

export function AdjustmentDetailClient({ id, locale }: { id: string; locale: 'ar' | 'en' }) {
 const t = useTranslations('operations.adjustment');
 const tCommon = useTranslations('common');
 const router = useRouter();

 const isNew = id === 'new';
 
 const { data: adjustment, isLoading } = useAdjustment(isNew ? null : id);
 const createAdjustment = useCreateAdjustment();
 const submitAdjustment = useSubmitAdjustment(id);
 const approveAdjustment = useApproveAdjustment(id);
 const rejectAdjustment = useRejectAdjustment(id);
 const postAdjustment = usePostAdjustment();
 const updateAdjustment = useUpdateAdjustment();

 const adjustmentStatus = adjustment?.status ?? 'DRAFT';
 const isPosted = adjustmentStatus === 'POSTED';
 const isDraft = adjustmentStatus === 'DRAFT';
 const isSubmitted = adjustmentStatus === 'SUBMITTED';
 const isApproved = adjustmentStatus === 'APPROVED';
 const isRejected = adjustmentStatus === 'REJECTED';
 
 const isReadOnly = !isDraft && !isNew && !isRejected;

 const { data: warehousesData } = useWarehouses();
 const [warehouseId, setWarehouseId] = useState('W-001');
 const { data: lockState } = useWarehouseLock(warehouseId);
 const [reason, setReason] = useState<string>('DAMAGE');
 const [notes, setNotes] = useState('');
 const [lines, setLines] = useState<AdjustmentLine[]>([]);
 
 // Dialog States
 const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
 const [approveDialogOpen, setApproveDialogOpen] = useState(false);
 const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
 const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error">("idle");
 const [statusMessage, setStatusMessage] = useState<string | undefined>();
 const [postDialogOpen, setPostDialogOpen] = useState(false);
 const [rejectionComment, setRejectionComment] = useState('');
 
 // Sync state with adjustment data when it arrives or changes records
 const [prevAdjustmentId, setPrevAdjustmentId] = useState<string | null>(null);
 if (adjustment && adjustment.id !== prevAdjustmentId) {
 setPrevAdjustmentId(adjustment.id);
 setWarehouseId(adjustment.warehouse_id);
 setReason(adjustment.reason);
 setNotes(adjustment.notes ?? '');
 setLines(adjustment.lines);
 }

 
 // Refresh stock levels when warehouse changes
 useEffect(() => {
 if ((isNew || isDraft || isRejected) && lines.length > 0) {
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
 
 const hasChanged = updatedLines.some((l, i) => l.qty_before !== lines[i].qty_before);
 if (hasChanged) {
 setLines(updatedLines);
 }
 };
 
 refreshStock();
 }
 }, [warehouseId, isNew, isDraft, isRejected]);

 const handleSaveDraft = async () => {
 if (lines.length === 0) return;
 try {
 const payload = {
 warehouse_id: warehouseId,
 reason,
 notes,
 lines: lines.map(l => ({
 id: l.id.startsWith('new-') ? undefined : l.id,
 item_id: l.item.id,
 qty: l.qty_adjusted,
 uom_id: l.uom_id,
 direction: l.direction
 }))
 };

 if (isNew) {
 await createAdjustment.mutateAsync(payload);
 router.push('/adjustments');
 } else {
 await updateAdjustment.mutateAsync({ id, payload });
 }
 } catch (e) {
 console.error(e);
 }
 };

 const handleSubmit = async () => {
 try {
 await submitAdjustment.mutateAsync();
 setSubmitDialogOpen(false);
 } catch (e) {
 console.error(e);
 }
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

 const handleReject = async () => {
 const trimmedComment = rejectionComment.trim();
 if (trimmedComment.length < 15) return;
 try {
 await rejectAdjustment.mutateAsync(trimmedComment);
 setRejectDialogOpen(false);
 setRejectionComment('');
 } catch (e) {
 console.error(e);
 }
 };

 const handlePost = async () => {
 if (!!lockState?.is_locked) return;
 try {
 await postAdjustment.mutateAsync(id);
 setPostDialogOpen(false);
 router.push('/adjustments');
 } catch (e) {
 console.error(e);
 }
 };

 const handleScan = async (barcode: string) => {
 if (!!lockState?.is_locked || isReadOnly) return;
 
 const resetAfterDelay = () => {
 setTimeout(() => {
 setScanStatus("idle");
 setStatusMessage(undefined);
 }, 2000);
 };

 try {
 setScanStatus("idle");
 setStatusMessage(undefined);

 const ItemSchema = z.object({
 data: z.array(z.object({
 id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string(),
 primary_uom: z.object({ id: z.string(), code: z.string() })
 }))
 });
 const res = await apiClient.get(`/master-data/items?barcode=${barcode}`, ItemSchema);
 
 if (res.data && res.data.length > 0) {
 const item = res.data[0];
 
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
 id: `new- ${Date.now()}`,
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

 setScanStatus("success");
 setStatusMessage(undefined);
 resetAfterDelay();
 } else {
 setScanStatus("error");
 setStatusMessage(t('scan.not_found'));
 resetAfterDelay();
 }
 } catch {
 setScanStatus("error");
 setStatusMessage(tCommon('error'));
 resetAfterDelay();
 }
 };

 const removeLine = (id: string) => {
 if (!!lockState?.is_locked || isReadOnly) return;
 setLines(prev => prev.filter(l => l.id !== id));
 };

 const updateLine = (id: string, updates: Partial<AdjustmentLine>) => {
 if (!!lockState?.is_locked || isReadOnly) return;
 setLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
 };

 const timelineEntries = useMemo(() => {
 if (!adjustment?.timeline) return [];
 return adjustment.timeline.map(e => ({
 status: e.status.toLowerCase() as Status,
 at: e.at,
 by: e.by
 }));
 }, [adjustment]);

 if (isLoading) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
 <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tCommon('loading')}</p>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-surface-container-low">
 {/* Sticky Glass Header */}
 <div className="sticky top-0 z-40 w-full glass-header h-16 border-b border-outline-variant/10 px-6 lg:px-10 flex items-center justify-between gap-6 transition-all">
 <div className="flex items-center gap-4 overflow-hidden">
 <Button 
 variant="ghost" 
 size="icon" 
 onClick={() => router.back()} 
 className="rounded-lg shrink-0 hover:bg-surface-container-high"
 >
 <ArrowLeft className={cn("w-5 h-5", locale === 'ar' && "rotate-180")} />
 </Button>
 <div className="flex flex-col min-w-0">
 <h1 className="text-title-lg font-semibold uppercase italic truncate">
 {isNew ? t('create_new') : (adjustment?.document_number || '...')}
 </h1>
 {!isNew && (
 <div className="flex items-center gap-2 mt-0.5">
 <StatusBadge status={adjustmentStatus} />
 <span className="text-label-xxs font-semibold uppercase text-muted-foreground/40 shrink-0">
 {format(new Date(adjustment?.created_at || new Date()), 'yyyy-MM-dd')}
 </span>
 </div>
 )}
 </div>
 </div>

 <div className="flex items-center gap-3 shrink-0">
 {isNew && (
 <PermissionGate action="create" resource="adjustment">
 <Button 
 onClick={handleSaveDraft} 
 disabled={createAdjustment.isPending || !!lockState?.is_locked || notes.trim().length < 10 || lines.length === 0}
 variant="ghost"
 className="rounded-lg h-10 px-4 text-label-xs font-semibold uppercase transition-all"
 >
 {t('save_draft')}
 </Button>
 <Button 
 onClick={() => setSubmitDialogOpen(true)}
 disabled={createAdjustment.isPending || !!lockState?.is_locked || notes.trim().length < 10 || lines.length === 0}
 className="bg-primary hover:bg-primary-hover text-white rounded-lg h-10 px-6 text-label-xs font-semibold uppercase shadow-lg shadow-primary/20"
 >
 <CheckCircle className="w-4 h-4 me-2" />
 {t('submit_for_approval')}
 </Button>
 </PermissionGate>
 )}

 {(isDraft || isRejected) && !isNew && (
 <>
 <Button 
 onClick={handleSaveDraft} 
 className="rounded-lg h-10 px-4 text-label-xs font-semibold uppercase transition-all"
 variant="ghost"
 >
 {tCommon('save_changes')}
 </Button>
 <Button 
 onClick={() => setSubmitDialogOpen(true)}
 className="bg-primary hover:bg-primary-hover text-white rounded-lg h-10 px-6 text-label-xs font-semibold uppercase shadow-lg shadow-primary/20"
 >
 <CheckCircle className="w-4 h-4 me-2" />
 {t('submit_for_approval')}
 </Button>
 </>
 )}

 {isSubmitted && (
 <PermissionGate action="approve" resource="adjustment">
 <div className="flex gap-2">
 <Button 
 variant="outline" 
 onClick={() => setRejectDialogOpen(true)}
 className="rounded-lg border-red-500/30 text-red-500 hover:bg-red-500/5 h-10 px-4 text-label-xs font-semibold uppercase"
 >
 <XCircle className="w-4 h-4 me-2" />
 {t('reject')}
 </Button>
 <Button 
 onClick={() => setApproveDialogOpen(true)}
 className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg h-10 px-6 text-label-xs font-semibold uppercase shadow-lg shadow-emerald-900/20"
 >
 <CheckCircle className="w-4 h-4 me-2" />
 {t('approve')}
 </Button>
 </div>
 </PermissionGate>
 )}

 {isApproved && (
 <PermissionGate action="post" resource="adjustment">
 <Button 
 onClick={() => setPostDialogOpen(true)}
 className="primary-gradient text-white rounded-lg h-10 px-8 text-label-xs font-semibold uppercase shadow-xl shadow-primary/20"
 >
 <CheckCircle className="w-4 h-4 me-2" />
 {t('post_adjustment')}
 </Button>
 </PermissionGate>
 )}
 </div>
 </div>

 {/* Main Content */}
 <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
 {/* Left Column */}
 <div className="lg:col-span-8 space-y-8">
 <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-4">
 <div className="space-y-1.5">
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tCommon('warehouse')}</label>
 <Select 
 value={warehouseId} 
 onValueChange={(val) => setWarehouseId(val || '')}
 disabled={isReadOnly || !!lockState?.is_locked}
 >
 <SelectTrigger className="bg-surface-container-low border-none h-12 rounded-lg font-bold text-body-md transition-all focus:ring-1 focus:ring-primary-fixed-dim/10">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-highest border-none rounded-lg shadow-2xl">
 {warehousesData?.data?.map(wh => (
 <SelectItem key={wh.id} value={wh.id} className="font-bold text-body-md">
 {locale === 'ar' ? wh.name_ar : wh.name_en}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('reason')}</label>
 <Select 
 value={reason} 
 onValueChange={(val) => setReason(val || '')}
 disabled={isReadOnly || !!lockState?.is_locked}
 >
 <SelectTrigger className="bg-surface-container-low border-none h-12 rounded-lg font-bold text-body-md transition-all focus:ring-1 focus:ring-primary-fixed-dim/10">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-highest border-none rounded-lg shadow-2xl">
 {REASON_OPTIONS.map(opt => (
 <SelectItem key={opt} value={opt} className="font-bold text-body-md">{t(`reasons.${opt.toLowerCase()}`)}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tCommon('notes')}</label>
 <Textarea
 value={notes}
 onChange={e => setNotes(e.target.value)}
 disabled={isReadOnly || !!lockState?.is_locked}
 placeholder={t('notes_placeholder')}
 className="bg-surface-container-low border-none rounded-lg h-[calc(6rem+3rem+1rem)] p-4 text-body-md resize-none focus:ring-1 focus:ring-primary-fixed-dim/10 transition-all"
 />
 </div>
 </div>

 {/* Item Scanning / Adding */}
 {!isReadOnly && !isPosted && (
 <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm space-y-6">
 <div className="flex items-center gap-3">
 <Package className="w-5 h-5 text-primary" />
 <h3 className="text-label-sm font-semibold uppercase">{t('add_item')}</h3>
 </div>
 <ScanInput 
 onScan={handleScan}
 placeholder={t('scan_placeholder')}
 disabled={!!lockState?.is_locked}
 scanStatus={scanStatus}
 statusMessage={statusMessage}
 />
 </div>
 )}

 {/* Items Table */}
 <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
 <div className="p-8 flex justify-between items-center">
 <div className="flex items-center gap-4">
 <div className="w-1.5 h-6 bg-primary rounded-full" />
 <h3 className="text-label-sm font-semibold uppercase">{tCommon('items')}</h3>
 </div>
 </div>
 <DocumentReadOnlyOverlay isPosted={isPosted || isSubmitted || isApproved}>
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-surface-container-low/50">
 <th className="px-8 h-14 text-start text-label-xs font-semibold uppercase text-muted-foreground/60">{tCommon('item')}</th>
 <th className="px-6 h-14 text-center text-label-xs font-semibold uppercase text-muted-foreground/60">{t('direction')}</th>
 <th className="px-6 h-14 text-center text-label-xs font-semibold uppercase text-muted-foreground/60">{t('qty_before')}</th>
 <th className="px-6 h-14 text-center text-label-xs font-semibold uppercase text-muted-foreground/60">{t('qty_adjusted')}</th>
 <th className="px-6 h-14 text-center text-label-xs font-semibold uppercase text-muted-foreground/60">{t('qty_after')}</th>
 {!isReadOnly && <th className="px-8 h-14 text-end"></th>}
 </tr>
 </thead>
 <tbody className="divide-y-0">
 {lines.length === 0 && (
 <tr>
 <td colSpan={isReadOnly ? 5 : 6} className="px-8 py-20 text-center">
 <div className="flex flex-col items-center gap-4 opacity-20">
 <Package className="w-12 h-12" />
 <p className="text-label-sm font-semibold uppercase">{tCommon('no_items')}</p>
 </div>
 </td>
 </tr>
 )}
 {lines.map((line) => (
 <tr key={line.id} className="group even:bg-surface-container-low/30 hover:bg-surface-container-high/20 transition-all border-none">
 <td className="px-8 py-6">
 <div className="flex flex-col min-w-0">
 <span className="text-body-md font-bold truncate">{locale === 'ar' ? line.item.name_ar : line.item.name_en}</span>
 <span className="text-label-xs font-mono text-primary/40 uppercase mt-1">{line.item.code}</span>
 </div>
 </td>
 <td className="px-6 py-6 text-center">
 {isReadOnly ? (
 <div className={cn(
 "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-xs font-semibold uppercase",
 line.direction === 'INCREASE' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
 )}>
 {line.direction === 'INCREASE' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
 {t(`direction_${line.direction.toLowerCase()}`)}
 </div>
 ) : (
 <Select
 value={line.direction}
 onValueChange={(val) => updateLine(line.id, { direction: val as 'INCREASE' | 'DECREASE' })}
 >
 <SelectTrigger className="bg-surface-container-low border-none h-10 w-32 mx-auto rounded-lg font-semibold text-label-xs uppercase focus:ring-1 focus:ring-primary-fixed-dim/10">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-highest border-none rounded-lg shadow-2xl">
 <SelectItem value="INCREASE" className="font-semibold text-label-xs uppercase text-emerald-500">{t('direction_increase')}</SelectItem>
 <SelectItem value="DECREASE" className="font-semibold text-label-xs uppercase text-red-500">{t('direction_decrease')}</SelectItem>
 </SelectContent>
 </Select>
 )}
 </td>
 <td className="px-6 py-6 text-center tabular-nums" dir="ltr">
 <div className="flex flex-col items-center gap-0.5">
 <span className="text-body-md font-bold font-mono text-muted-foreground/40">{formatQuantity(line.qty_before, locale)}</span>
 <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">{line.item.primary_uom.code}</span>
 </div>
 </td>
 <td className="px-6 py-6 text-center tabular-nums" dir="ltr">
 <div className="flex flex-col items-center gap-0.5">
 {isReadOnly ? (
 <span className={cn("text-body-md font-mono font-semibold", line.direction === 'INCREASE' ? "text-emerald-500" : "text-red-500")}>
 {line.direction === 'INCREASE' ? '+' : '−'}{formatQuantity(line.qty_adjusted, locale)}
 </span>
 ) : (
 <input 
 type="number"
 value={line.qty_adjusted}
 onChange={e => updateLine(line.id, { qty_adjusted: Number(e.target.value) })}
 className="bg-surface-container-low border-none h-10 w-24 text-center rounded-lg font-mono font-semibold text-body-md transition-all focus:ring-1 focus:ring-primary-fixed-dim/10"
 step="0.001"
 min="0"
 />
 )}
 <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">{line.item.primary_uom.code}</span>
 </div>
 </td>
 <td className="px-6 py-6 text-center tabular-nums" dir="ltr">
 <div className="flex flex-col items-center gap-0.5">
 <span className={cn(
 "text-body-md font-bold font-mono",
 (line.direction === 'INCREASE' ? line.qty_before + line.qty_adjusted : line.qty_before - line.qty_adjusted) < 0 ? "text-red-500" : "text-foreground"
 )}>
 {formatQuantity(line.direction === 'INCREASE' ? line.qty_before + line.qty_adjusted : line.qty_before - line.qty_adjusted, locale)}
 </span>
 <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">{line.item.primary_uom.code}</span>
 </div>
 </td>
 {!isReadOnly && (
 <td className="px-8 py-6 text-end">
 <Button 
 variant="ghost" 
 size="icon" 
 onClick={() => removeLine(line.id)}
 className="h-8 w-8 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
 >
 <Trash2 className="w-4 h-4" />
 </Button>
 </td>
 )}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </DocumentReadOnlyOverlay>
 </div>
 </div>

 {/* Right Column */}
 <div className="lg:col-span-4 space-y-8">
 <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm relative overflow-hidden group">
 <div className="absolute top-0 end-0 w-32 h-32 bg-primary/5 blur-[50px] -me-16 -mt-16 rounded-full group-hover:bg-primary/10 transition-all duration-700" />
 <div className="relative space-y-8">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
 <History className="w-5 h-5 text-primary" />
 </div>
 <h4 className="text-label-xs font-semibold uppercase">{tCommon('history')}</h4>
 </div>
 {timelineEntries.length > 0 ? (
 <div className="ps-2">
 <StatusTimeline entries={timelineEntries} />
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center py-8 opacity-20 gap-3">
 <Clock className="w-10 h-10" />
 <p className="text-label-xs font-semibold uppercase">{t('no_history')}</p>
 </div>
 )}
 </div>
 </div>

 {!isNew && (
 <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm space-y-6">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
 <Info className="w-5 h-5 text-emerald-500" />
 </div>
 <h4 className="text-label-xs font-semibold uppercase">{t('document_info')}</h4>
 </div>
 <div className="space-y-4">
 <div className="flex justify-between items-center py-3 border-b border-surface-container-low">
 <span className="text-label-sm text-muted-foreground">{tCommon('status')}</span>
 <StatusBadge status={adjustmentStatus} />
 </div>
 {adjustment?.posted_at && (
 <div className="flex justify-between items-center py-3 border-b border-surface-container-low">
 <span className="text-label-sm text-muted-foreground">{t('posted_at')}</span>
 <span className="text-label-xs font-bold" dir="ltr">
 {format(new Date(adjustment.posted_at), 'yyyy-MM-dd HH:mm')}
 </span>
 </div>
 )}
 {adjustment?.approved_by && (
 <div className="flex justify-between items-center py-3 border-b border-surface-container-low">
 <span className="text-label-sm text-muted-foreground">{t('approved_by')}</span>
 <span className="text-label-xs font-semibold uppercase text-foreground/70">{adjustment.approved_by}</span>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Confirmation Dialogs */}
 <PostConfirmDialog
 open={submitDialogOpen}
 onOpenChange={setSubmitDialogOpen}
 title={t('submit_confirm_title')}
 description={t('submit_confirm_desc')}
 onConfirm={handleSubmit}
 isLoading={submitAdjustment.isPending}
 />

 <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
 <DialogContent className="bg-surface-container-lowest border-none shadow-2xl rounded-lg p-0 overflow-hidden max-w-md">
 <div className="p-8 space-y-6">
 <DialogHeader>
 <DialogTitle className="text-title-lg font-semibold uppercase italic text-red-500">{t('reject_title')}</DialogTitle>
 <DialogDescription className="text-label-sm font-medium text-muted-foreground">
 {t('reject_desc')}
 </DialogDescription>
 </DialogHeader>
 <Textarea
 value={rejectionComment}
 onChange={e => setRejectionComment(e.target.value)}
 placeholder={t('rejection_comment_placeholder')}
 className="bg-surface-container-highest border-none rounded-lg min-h-[120px] p-4 text-body-md resize-none"
 />
 {rejectionComment.trim().length > 0 && rejectionComment.trim().length < 15 && (
 <p className="text-label-xs font-semibold uppercase text-red-500 flex items-center gap-2">
 <AlertCircle className="w-3 h-3" />
 {t('min_chars_required', { count: 15 - rejectionComment.trim().length })}
 </p>
 )}
 </div>
 <DialogFooter className="p-8 bg-surface-container-low flex items-center justify-end gap-3">
 <Button variant="ghost" onClick={() => setRejectDialogOpen(false)} className="rounded-lg text-label-xs font-semibold uppercase">
 {tCommon('cancel')}
 </Button>
 <Button 
 onClick={handleReject}
 disabled={rejectionComment.trim().length < 15 || rejectAdjustment.isPending}
 className="bg-red-600 hover:bg-red-500 text-white rounded-lg h-12 px-8 text-label-xs font-semibold uppercase"
 >
 {t('confirm_rejection')}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 <PostConfirmDialog
 open={approveDialogOpen}
 onOpenChange={setApproveDialogOpen}
 title={t('approve_confirm_title')}
 description={t('approve_confirm_desc')}
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
