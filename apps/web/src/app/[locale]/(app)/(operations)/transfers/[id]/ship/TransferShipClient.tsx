'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { LockBanner } from '@/components/shared/LockBanner';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { useTransfer, TransferLine } from '@/features/operations/hooks/useTransfer';
import { useShipTransfer } from '@/features/operations/hooks/useShipTransfer';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { cn } from '@/lib/utils';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { isDocumentLocked, canPerformActionV2, type DocumentStatus } from '@/core/workflow/document-engine';
import { useAuth } from '@/providers/AuthProvider';
import { AlertCircle, Truck, ArrowLeft } from 'lucide-react';

export function TransferShipClient({ id, locale }: { id: string; locale: 'ar' | 'en' }) {
 const t = useTranslations('operations.transfer');
 const tCommon = useTranslations('common');
 const router = useRouter();

 const { data: transfer, isLoading } = useTransfer(id);
 const { user } = useAuth();
 const shipTransfer = useShipTransfer();

 const [scannedLines, setScannedLines] = useState<Record<string, number>>({});
 const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
 const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
 const [statusMessage, setStatusMessage] = useState('');

 const { data: fromLockState } = useWarehouseLock(transfer?.from_warehouse_id ?? '');
 const { data: toLockState } = useWarehouseLock(transfer?.to_warehouse_id ?? '');
 const isEitherLocked = (fromLockState?.isLocked || toLockState?.isLocked) ?? false;

 const handleScan = useCallback((barcode: string) => {
 const line = transfer?.lines.find(l => l.item?.code === barcode);
 if (line) {
 setScannedLines(prev => ({
 ...prev,
 [line.id]: (prev[line.id] ?? 0) + 1
 }));
 setScanStatus('success');
 setStatusMessage(`${t('scan_success')}: ${locale === 'ar' ? line.item?.name_ar : line.item?.name_en}`);
 setTimeout(() => setScanStatus('idle'), 2000);
 } else {
 setScanStatus('error');
 setStatusMessage(t('scan_error'));
 setTimeout(() => setScanStatus('idle'), 2000);
 }
 }, [transfer, t, locale]);

 const handleShip = async () => {
 try {
 if (!transfer) return;
 await shipTransfer.mutateAsync({ id, version: transfer.version || 1 });
 router.push(`/transfers/${id}`);
 } catch (e) {
 console.error(e);
 }
 };

 if (isLoading || !transfer) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
 <div className="relative w-24 h-24 flex items-center justify-center text-cyan-500">
 <Truck className="w-12 h-12 animate-bounce" />
 </div>
 </div>
 );
 }

  if (!canPerformActionV2('TRANSFER', transfer?.transfer_status as DocumentStatus, 'SHIP', user?.role)) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
 <AlertCircle className="w-12 h-12 text-status-error" />
 <p className="font-bold text-title-sm">{t('invalid_status_for_ship')}</p>
 <Button onClick={() => router.push(`/transfers/${id}`)} variant="outline">
 {tCommon('back')}
 </Button>
 </div>
 );
 }

 const allScanned = transfer.lines.every(l => (scannedLines[l.id] ?? 0) >= l.qty);

 return (
 <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
 <div className="flex items-center justify-between">
 <Breadcrumb 
 items={[
 { label: t('title'), href: `/transfers` },
 { label: transfer.document_number, href: `/transfers/${id}` },
 { label: t('ship') }
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
 title={t('ship_transfer')}
 description={t('ship_confirm_desc')}
 actions={
 <PermissionGate action="post" resource="transfer">
 <Button
 disabled={isEitherLocked || shipTransfer.isPending}
 onClick={() => setConfirmDialogOpen(true)}
 className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl h-12 px-10 text-label-xs font-semibold uppercase transition-all shadow-xl shadow-cyan-900/40"
 >
 <Truck className="w-4 h-4 me-2" />
 {t('confirm_shipment')}
 </Button>
 </PermissionGate>
 }
 />

 <div className="space-y-4">
 {fromLockState?.isLocked && <LockBanner lockState={fromLockState} />}
 {toLockState?.isLocked && toLockState.sessionId !== fromLockState?.sessionId && (
 <LockBanner lockState={toLockState} />
 )}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <div className="lg:col-span-1">
 <div className="bg-surface-container-low/50 rounded-3xl border border-white/5 p-8 space-y-8 relative overflow-hidden h-full">
 <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500/50 to-transparent" />
 
 <div className="space-y-6">
 <div className="space-y-1">
 <span className="text-label-xs font-semibold uppercase text-muted-foreground/50">{t('from_warehouse')}</span>
 <p className="text-title-lg font-semibold">{transfer.from_warehouse_name}</p>
 </div>

 <div className="space-y-1">
 <span className="text-label-xs font-semibold uppercase text-muted-foreground/50">{t('to_warehouse')}</span>
 <p className="text-title-lg font-semibold">{transfer.to_warehouse_name}</p>
 </div>

 <div className="pt-6 border-t border-white/5">
 <ScanInput
 onScan={handleScan}
 placeholder={t('scan_placeholder_ship')}
 scanStatus={scanStatus}
 statusMessage={statusMessage}
 scannerMode={true}
 className="w-full"
 />
 </div>
 </div>
 </div>
 </div>

 <div className="lg:col-span-2">
 <div className="bg-surface-container-low/30 rounded-3xl border border-white/5 overflow-hidden shadow-2xl h-full">
 <div className="p-6 border-b border-white/5 flex items-center justify-between bg-surface-container-low">
 <h3 className="text-label-xs font-semibold uppercase text-cyan-500">{t('manifest_items')}</h3>
 <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 rounded-full border border-cyan-500/20">
 <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", allScanned ? "bg-emerald-500" : "bg-cyan-500")} />
 <span className={cn("text-label-xxs font-semibold uppercase tracking-normal", allScanned ? "text-emerald-500" : "text-cyan-500")}>
 {allScanned ? tCommon('status.completed') : t('verification_in_progress')}
 </span>
 </div>
 </div>
 
 <DocumentLineItemTable
 lines={transfer.lines}
 locale={locale}
 isReadOnly={true}
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
 header: tCommon('status.status'),
 cell: (line: TransferLine) => {
 const scanned = scannedLines[line.id] ?? 0;
 const isFullyScanned = scanned >= line.qty;
 return (
 <div className="flex justify-center">
 <div className={cn(
 "px-3 py-1 rounded-lg text-label-xs font-semibold uppercase flex items-center gap-2",
 isFullyScanned 
 ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
 : scanned > 0 
 ? "bg-cyan-500/10 text-cyan-500 border border-cyan-500/20"
 : "bg-surface-container-highest text-muted-foreground/40 border border-white/5"
 )}>
 {isFullyScanned ? `✓ ${t('verified_label')}` : `${scanned}/${line.qty}`}
 </div>
 </div>
 );
 }
 }
 ]}
 />
 </div>
 </div>
 </div>

 <PostConfirmDialog
 open={confirmDialogOpen}
 onOpenChange={setConfirmDialogOpen}
 title={t('ship_confirm_title')}
 description={t('ship_confirm_desc')}
 warningText={t('ship_confirm_warning')}
 requiresTextConfirmation={false}
 onConfirm={handleShip}
 isLoading={shipTransfer.isPending}
 />
 </div>
 );
}
