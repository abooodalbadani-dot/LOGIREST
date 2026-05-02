'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { LockBanner } from '@/components/shared/LockBanner';
import { useTransfer, TransferLine } from '@/features/operations/hooks/useTransfer';
import { useReceiveTransfer } from '@/features/operations/hooks/useReceiveTransfer';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PackageCheck, ArrowLeft, AlertCircle, Info } from 'lucide-react';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { cn } from '@/lib/utils';

export function TransferReceiveClient({ id, locale }: { id: string; locale: 'ar' | 'en' }) {
 const t = useTranslations('operations.transfer');
 const tCommon = useTranslations('common');
 const router = useRouter();

 const { data: transfer, isLoading } = useTransfer(id);
 const receiveTransfer = useReceiveTransfer(id);

 const [lines, setLines] = useState<(TransferLine & { _receivedQty?: number })[]>([]);
 const [varianceReason, setVarianceReason] = useState('');
 const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
 const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
 const [statusMessage, setStatusMessage] = useState('');

 const { data: fromLockState } = useWarehouseLock(transfer?.from_warehouse_id ?? '');
 const { data: toLockState } = useWarehouseLock(transfer?.to_warehouse_id ?? '');
 const isEitherLocked = (fromLockState?.is_locked || toLockState?.is_locked) ?? false;

 const [prevTransferId, setPrevTransferId] = useState<string | null>(null);
 
 if (transfer && transfer.id !== prevTransferId) {
 setPrevTransferId(transfer.id);
 setLines(transfer.lines.map(l => ({ 
 ...l, 
 _receivedQty: l.qty 
 })));
 }

 const hasVariance = lines.some(l => (l._receivedQty ?? 0) !== (l.shipped_qty ?? l.qty));
 const isVarianceValid = !hasVariance || varianceReason.trim().length >= 10;

 const handleReceive = async () => {
 try {
 const receiveLines = lines.map(l => ({
 line_id: l.id,
 received_qty: l._receivedQty ?? l.qty
 }));
 
 await receiveTransfer.mutateAsync({
 lines: receiveLines,
 confirmation: 'ACKNOWLEDGE_IRREVERSIBLE',
 variance_reason: hasVariance ? varianceReason : undefined
 });
 
 router.push(`/ ${locale}/transfers/ ${id}`);
 } catch (e) {
 console.error(e);
 }
 };

 if (isLoading) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
 <div className="relative w-24 h-24 flex items-center justify-center text-emerald-500">
 <PackageCheck className="w-12 h-12 animate-pulse" />
 </div>
 </div>
 );
 }

 if (transfer?.transfer_status !== 'IN_TRANSIT') {
 return (
 <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
 <AlertCircle className="w-12 h-12 text-status-error" />
 <p className="font-bold text-title-sm">{t('invalid_status_for_receive')}</p>
 <Button onClick={() => router.push(`/ ${locale}/transfers/ ${id}`)} variant="outline">
 {tCommon('back')}
 </Button>
 </div>
 );
 }

 return (
 <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
 <div className="flex items-center justify-between">
 <Breadcrumb 
 items={[
 { label: t('title'), href: `/ ${locale}/transfers` },
 { label: transfer.document_number, href: `/ ${locale}/transfers/ ${id}` },
 { label: t('receive') }
 ]} 
 />
 <Button
 variant="ghost"
 onClick={() => router.back()}
 className="text-label-xs font-semibold uppercase text-muted-foreground hover:text-foreground"
 >
 <ArrowLeft className="w-3 h-3 me-2" />
 {tCommon('back')}
 </Button>
 </div>

 <PageHeader
 title={t('confirm_receipt')}
 description={t('receive_confirm_desc')}
 actions={
 <PermissionGate action="post" resource="transfer">
 <div title={!isVarianceValid ? t('variance_required_error') : undefined}>
 <Button
 disabled={isEitherLocked || receiveTransfer.isPending || !isVarianceValid}
 onClick={() => setConfirmDialogOpen(true)}
 className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-12 px-10 text-label-xs font-semibold uppercase transition-all shadow-xl shadow-emerald-900/40 disabled:opacity-50"
 >
 <PackageCheck className="w-4 h-4 me-2" />
 {t('complete_receive')}
 </Button>
 </div>
 </PermissionGate>
 }
 />

 <div className="space-y-4">
 {fromLockState?.is_locked && <LockBanner lockState={fromLockState} />}
 {toLockState?.is_locked && toLockState.session_id !== fromLockState?.session_id && (
 <LockBanner lockState={toLockState} />
 )}
 
 {hasVariance && (
 <div className="bg-status-warning/10 border border-status-warning/30 rounded-2xl p-4 flex items-start gap-4 animate-in slide-in-from-top-2 duration-500">
 <Info className="w-5 h-5 text-status-warning mt-0.5" />
 <div className="space-y-1">
 <p className="text-label-sm font-semibold text-status-warning uppercase">{t('variance_detected')}</p>
 <p className="text-body-md text-status-warning/80 font-medium">{t('variance_instruction')}</p>
 </div>
 </div>
 )}
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="bg-surface-container-low/50 rounded-3xl border border-white/5 p-8 space-y-6 relative overflow-hidden h-full">
 <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500/50 to-transparent" />
 <div className="flex justify-between items-start">
 <div className="space-y-1">
 <span className="text-label-xs font-semibold uppercase text-muted-foreground/50">{t('destination')}</span>
 <p className="text-title-lg font-semibold">{transfer.to_warehouse_name}</p>
 </div>
 <div className="bg-emerald-500/10 p-3 rounded-2xl">
 <PackageCheck className="w-6 h-6 text-emerald-500" />
 </div>
 </div>

 <div className="pt-4 border-t border-white/5 space-y-4">
 <div className="space-y-2">
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{tCommon('notes')}</label>
 <p className="text-body-md font-medium text-foreground/80 leading-relaxed bg-surface-container-highest/20 p-3 rounded-xl border border-white/5">
 {transfer.notes || '—'}
 </p>
 </div>
 </div>
 </div>

 <div className={`bg-surface-container-low/50 rounded-3xl border p-8 space-y-4 transition-all duration-500 ${hasVariance ? 'border-status-warning/40 shadow-xl shadow-status-warning/5' : 'border-white/5'}`}>
 <div className="flex items-center justify-between">
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('variance_reason')}</label>
 {hasVariance && (
 <span className={`text-label-xxs font-bold px-2 py-0.5 rounded-full ${varianceReason.trim().length >= 10 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-status-error/10 text-status-error border border-status-error/20'}`}>
 {varianceReason.trim().length}/10
 </span>
 )}
 </div>
 <textarea
 value={varianceReason}
 onChange={e => setVarianceReason(e.target.value)}
 disabled={!hasVariance}
 placeholder={t('variance_reason_placeholder')}
 className={`w-full bg-surface-container-highest/40 border rounded-2xl p-4 font-medium text-body-md focus:ring-2 transition-all outline-none resize-none min-h-[140px] ${ hasVariance ? 'border-status-warning/20 focus:ring-status-warning/30 hover:bg-surface-container-highest/60' : 'border-white/5 opacity-40 cursor-not-allowed' }`}
 />
 {!isVarianceValid && hasVariance && (
 <p className="text-label-xs font-bold text-status-error animate-pulse flex items-center gap-1">
 <AlertCircle className="w-3 h-3" />
 {t('variance_required_error')}
 </p>
 )}
 </div>
 </div>

 <div className="bg-surface-container-low/30 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
 <div className="p-6 border-b border-white/5 flex items-center justify-between bg-surface-container-low">
 <div className="flex items-center gap-4">
 <h3 className="text-label-xs font-semibold uppercase text-emerald-500">{t('items_to_receive')}</h3>
 <div className="h-4 w-px bg-white/10" />
 <span className="text-label-xs font-bold text-muted-foreground/60">{lines.length} {tCommon('items')}</span>
 </div>
 <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
 <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
 <span className="text-label-xxs font-semibold uppercase text-emerald-500">{t('scan_mode')}</span>
 </div>
 </div>

 <div className="p-6 bg-surface-container-low/50 border-b border-white/5">
 <ScanInput
 onScan={(barcode) => {
 const lineIndex = lines.findIndex(l => l.item?.code === barcode);
 if (lineIndex !== -1) {
 setLines(prev => prev.map((l, i) => 
 i === lineIndex ? { ...l, _receivedQty: (l._receivedQty ?? 0) + 1 } : l
 ));
 setScanStatus('success');
 setStatusMessage(`${t('scan_success')}: ${locale === 'ar' ? lines[lineIndex].item?.name_ar : lines[lineIndex].item?.name_en}`);
 setTimeout(() => setScanStatus('idle'), 2000);
 } else {
 setScanStatus('error');
 setStatusMessage(t('scan_error'));
 setTimeout(() => setScanStatus('idle'), 2000);
 }
 }}
 placeholder={t('scan_placeholder_receive')}
 scanStatus={scanStatus}
 statusMessage={statusMessage}
 className="max-w-md mx-auto"
 />
 </div>

 <DocumentLineItemTable
 lines={lines}
 locale={locale}
 isReadOnly={false}
 onRemoveLine={() => {}}
 hideLotColumns={true}
 headers={{
 code: tCommon('table_headers.code'),
 name: tCommon('table_headers.name'),
 qty: t('transfer_qty'),
 uom: tCommon('table_headers.uom'),
 }}
 extraColumns={[
 {
 header: t('shipped_qty'),
 cell: (line: TransferLine & { _receivedQty?: number }) => (
 <div className="flex justify-center">
 <span dir="ltr" className="font-mono text-body-md font-semibold bg-surface-container-highest px-3 py-1 rounded-lg border border-white/5">
 {line.shipped_qty ?? line.qty}
 </span>
 </div>
 ),
 },
 {
 header: t('received_qty'),
 cell: (line: TransferLine & { _receivedQty?: number }) => (
 <div className="flex justify-center">
 <input
 type="number"
 dir="ltr"
 className={`w-24 bg-surface-container-highest border rounded-lg text-center px-2 py-2 font-mono font-bold focus:ring-2 outline-none transition-all ${ (line._receivedQty ?? 0) !== (line.shipped_qty ?? line.qty) ? 'text-status-warning border-status-warning/40 focus:ring-status-warning/30 shadow-[0_0_15px_rgba(255,152,0,0.1)]' : 'text-emerald-500 border-emerald-500/20 focus:ring-emerald-500/30' }`}
 value={line._receivedQty ?? line.qty}
 onChange={e => {
 const val = Number(e.target.value);
 setLines(prev =>
 prev.map(l => l.id === line.id ? { ...l, _receivedQty: val } : l)
 );
 }}
 />
 </div>
 ),
 },
 ]}
 />
 </div>

 <PostConfirmDialog
 open={confirmDialogOpen}
 onOpenChange={setConfirmDialogOpen}
 title={t('receive_confirm_title')}
 description={t('receive_confirm_desc')}
 warningText={t('receive_confirm_warning')}
 requiresTextConfirmation={true}
 onConfirm={handleReceive}
 isLoading={receiveTransfer.isPending}
 />
 </div>
 );
}
