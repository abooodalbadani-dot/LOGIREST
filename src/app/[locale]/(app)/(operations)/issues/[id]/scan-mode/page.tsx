'use client';

import { use, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { ScanLog } from '@/components/shared/ScanInput/ScanLog';
import { FEFOLotAllocator } from '@/components/shared/FEFOLotAllocator/FEFOLotAllocator';
import { LockBanner } from '@/components/shared/LockBanner';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { useIssue } from '@/features/operations/hooks/useIssue';
import { usePostIssue } from '@/features/operations/hooks/usePostIssue';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { useLotsByItem } from '@/features/operations/hooks/useLotsByItem';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/providers/AuthProvider';
import type { Lot } from '@/types/master-data';
import type { BadgeStatus } from '@/components/shared/StatusBadge';
import type { LotAllocation } from '@/types/documents';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { isIssuePosted } from '@/domain/status-guards';

type ScanEntry = { barcode: string; item_name: string; timestamp: Date; success: boolean };

type LineItem = {
 id: string;
 item: { id: string; code: string; name_ar: string; name_en: string; primary_uom: { id: string; code: string; name_ar: string; name_en: string } };
 qty: number;
 uom_id: string;
 lot_allocations: LotAllocation[];
};

export default function IssueScanModePage(props: { params: Promise<{ locale: string; id: string }> }) {
 const params = use(props.params);
 const { locale, id } = params;

 return (
 <ProtectedRoute requiredResource="issue" requiredAction="edit">
 <IssueScanModeContent locale={locale} id={id} />
 </ProtectedRoute>
 );
}

function IssueScanModeContent({ locale, id }: { locale: string, id: string }) {
 const t = useTranslations('operations.issue');
 const router = useRouter();
 const { user } = useAuth();
 
 const isNew = id === 'new';
 const { data: issue, isLoading } = useIssue(isNew ? null : id);
 const postIssue = usePostIssue(id);
 
 const [lines, setLines] = useState<LineItem[]>([]);
 const [warehouseId, setWarehouseId] = useState('wh-1');
 const [scanLog, setScanLog] = useState<ScanEntry[]>([]);
 const [scanError, setScanError] = useState('');
 const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
 const [isWarehouseLockedError, setIsWarehouseLockedError] = useState(false);

 const [fefoOpen, setFefoOpen] = useState(false);
 const [activeLine, setActiveLine] = useState<LineItem | null>(null);

 const { data: lots = [] } = useLotsByItem({ 
 item_id: activeLine?.item?.id, 
 warehouse_id: warehouseId 
 });

 const { data: lockState } = useWarehouseLock(warehouseId);

 useEffect(() => {
 if (issue) {
 // Synchronize internal state with fetched issue data
 // eslint-disable-next-line react-hooks/set-state-in-effect
 setLines((issue.lines || []) as unknown as LineItem[]);
 // eslint-disable-next-line react-hooks/set-state-in-effect
 setWarehouseId(issue.warehouse_id || 'wh-1');
 }
 }, [issue]);

 const handleScan = async (barcode: string) => {
 try {
 setScanError('');
 const ItemSchema = z.object({
 data: z.array(z.object({
 id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string(),
 primary_uom: z.object({ id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string() })
 }))
 });
 const res = await apiClient.get(`/master-data/items?barcode=${barcode}`, ItemSchema);
 if (res.data && res.data.length > 0) {
 const item = res.data[0];
 let targetLine: LineItem | undefined;
 setLines(prev => {
 const existing = prev.find(l => l.item.id === item.id);
 if (existing) {
 targetLine = { ...existing, qty: existing.qty + 1 };
 return prev.map(l => l.item.id === item.id ? targetLine! : l);
 }
 targetLine = { id: `new- ${Date.now()}`, item, qty: 1, uom_id: item.primary_uom.id, lot_allocations: [] };
 return [...prev, targetLine];
 });
 setScanLog(prev => [{ barcode, item_name: item.name_en, timestamp: new Date(), success: true }, ...prev].slice(0, 10));
 // Auto-open FEFO allocator for new scans
 setTimeout(() => {
 if (targetLine) { setActiveLine(targetLine); setFefoOpen(true); }
 }, 100);
 } else {
 setScanLog(prev => [{ barcode, item_name: '', timestamp: new Date(), success: false }, ...prev].slice(0, 10));
 setScanError(t('no_item_found'));
 }
 } catch {
 setScanLog(prev => [{ barcode, item_name: '', timestamp: new Date(), success: false }, ...prev].slice(0, 10));
 setScanError(t('no_item_found'));
 }
 };

 const handlePost = async () => {
 try {
 await postIssue.mutateAsync({ confirmation: 'ACKNOWLEDGE_IRREVERSIBLE', version: (issue as any)?.version || 0 });
 setIsPostDialogOpen(false);
 router.push("/issues");
 } catch (err: unknown) {
 const apiErr = err as { code?: string };
 if (apiErr?.code === 'WAREHOUSE_LOCKED') setIsWarehouseLockedError(true);
 setIsPostDialogOpen(false);
 }
 };

 const isPosted = isIssuePosted(issue?.status);
 const isLocked = (lockState?.isLocked ?? false) || isWarehouseLockedError;

 if (isLoading) return <div className="p-8 text-center">Loading...</div>;

 return (
 <div className="min-h-screen bg-surface-container-lowest flex flex-col p-4 space-y-6">
 {/* Immersive Header */}
 <div className="flex justify-between items-center bg-surface-container-low p-6 rounded-2xl border-s-4 border-operational-cyan shadow-xl">
 <div>
 <h1 className="text-headline-lg font-bold">{isNew ? t('create_new') : issue?.document_number}</h1>
 <div className="flex items-center gap-2 mt-1">
 <span className="relative flex h-2 w-2">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-operational-cyan opacity-75"></span>
 <span className="relative inline-flex rounded-full h-2 w-2 bg-operational-cyan"></span>
 </span>
 <span className="text-operational-cyan/80 text-label-sm font-mono uppercase italic">Immersive Scan Mode</span>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <StatusBadge status={(issue?.status ?? 'DRAFT') as BadgeStatus} />
 <Link href={`/issues/${id}`}>
 <Button variant="outline" size="sm">Exit Scan Mode</Button>
 </Link>
 </div>
 </div>

 {(isLocked) && <LockBanner lockState={lockState} />}

 {/* Massive Scan Input for Tablets */}
 <div className="bg-surface-container-low p-8 rounded-3xl border border-cyan-500/20 shadow-2xl flex-1 flex flex-col">
 <ScanInput 
 onScan={handleScan} 
 disabled={isPosted || isLocked} 
 placeholder="READY FOR BARCODE..." 
 className="text-headline-lg py-10 font-mono text-center bg-surface-container-highest border-none rounded-3xl focus:ring-4 focus:ring-operational-cyan/30 transition-all placeholder:text-foreground/30 shadow-inner"
 scannerMode={true}
 />
 {scanError && <div className="text-status-error text-center mt-6 text-title-lg font-bold animate-bounce uppercase">{scanError}</div>}
 
 <div className="mt-8 flex-1 overflow-auto">
 {lines.length > 0 ? (
 <div className="space-y-4">
 {lines.map(line => {
 const totalAllocated = (line.lot_allocations || []).reduce((sum: number, a: LotAllocation) => sum + a.allocated_qty, 0);
 const isFullyAllocated = totalAllocated >= line.qty;
 
 return (
 <div key={line.id} className="bg-surface-container-high border border-border-muted/50 p-6 rounded-2xl shadow-md transition-all hover:scale-[1.01] flex items-center justify-between group">
 <div>
 <div className="text-title-lg font-bold group-hover:text-operational-cyan transition-colors">{line.item.name_ar} / {line.item.name_en}</div>
 <div className="text-muted-foreground text-body-md font-mono mt-1 opacity-70">{line.item.code}</div>
 </div>
 <div className="flex items-center gap-8">
 <div className="text-end">
 <div className="text-label-sm text-muted-foreground uppercase mb-1">Quantity</div>
 <div className="text-headline-lg font-bold font-mono">{line.qty} <span className="text-body-md opacity-60">{line.item.primary_uom.code}</span></div>
 </div>
 <button 
 className={`px-6 py-3 rounded-xl border-2 font-semibold transition-all ${isFullyAllocated ? 'border-operational-cyan text-operational-cyan bg-operational-cyan/5 hover:bg-operational-cyan/10' : 'border-status-error text-status-error animate-pulse bg-status-error/5 hover:bg-status-error/10'}`}
 onClick={() => { setActiveLine(line); setFefoOpen(true); }}
 disabled={isPosted}
 >
 {isFullyAllocated ? `ALLOCATED ✓` : `PENDING LOTS`}
 </button>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="flex h-full items-center justify-center flex-col text-muted-foreground">
 <div className="text-headline-lg mb-4">📦</div>
 <div className="text-headline-lg">Awaiting First Scan</div>
 </div>
 )}
 </div>
 </div>

 {/* Scan Log */}
 {scanLog.length > 0 && (
 <div className="bg-surface-container-low p-5 rounded-2xl shadow-inner border border-white/5">
 <h3 className="text-label-xs text-cyan-500/60 mb-3 uppercase font-semibold">{t('scan_log_title')}</h3>
 <ScanLog entries={scanLog} />
 </div>
 )}

 {/* Footer actions */}
 {!isPosted && (
 <div className="flex gap-3 pb-4">
 <Button variant="outline" className="flex-1" disabled={isLocked}>
 {t('save_draft')}
 </Button>
 <Button
 className="flex-1 bg-operational-cyan text-white hover:bg-operational-cyan/80"
 disabled={isLocked || lines.length === 0}
 onClick={() => setIsPostDialogOpen(true)}
 >
 {t('post_issue')}
 </Button>
 </div>
 )}

 <PostConfirmDialog
 open={isPostDialogOpen}
 onOpenChange={setIsPostDialogOpen}
 title={t('post_confirm_title')}
 description={t('post_confirm_desc')}
 warningText={t('post_confirm_desc')}
 requiresTextConfirmation
 isLoading={postIssue.isPending}
 onConfirm={handlePost}
 />
 <Dialog open={fefoOpen} onOpenChange={setFefoOpen}>
 <DialogContent className="max-h-[90vh] max-w-2xl bg-surface-container border border-border-muted/50 overflow-y-auto">
 <DialogHeader>
 <DialogTitle className="text-headline-lg">{t('fefo_drawer_title')}: {activeLine?.item.name_en}</DialogTitle>
 </DialogHeader>
 <div className="py-4 overflow-y-auto pb-20">
 {activeLine && (
 <FEFOLotAllocator
 lots={lots as Lot[]}
 requestedQty={activeLine.qty}
 uomLabel={activeLine.item.primary_uom.code}
 userRole={user?.role || 'WH_KEEPER'} onAllocate={(allocations) => {
 setLines(prev => prev.map(l => l.id === activeLine.id ? {
 ...l, lot_allocations: allocations
 } : l));
 setFefoOpen(false);
 }}
 onClose={() => setFefoOpen(false)}
 />
 )}
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}
