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
import { isDocumentLocked } from '@logirest/shared-types';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { toast } from 'sonner';
import { RelationalName } from '@/components/shared/RelationalName';

import { Barcode, CheckCircle2, AlertCircle, AlertTriangle, Package, X, Save, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

type ScanEntry = { barcode: string; item_name: string; timestamp: Date; success: boolean };

type LineItem = {
    id: string;
    item: { id: string; code: string; name: string; nameAr?: string; nameEn?: string; image?: string | null; primaryUom?: { id: string; code: string; name?: string; nameAr?: string; nameEn?: string } | null };
    qty: number;
    uomId: string;
    lotAllocations: LotAllocation[];
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
    const { user, activeScope } = useAuth();
    const router = useRouter();

    const isNew = id === 'new';
    const { data: issue, isLoading } = useIssue(isNew ? null : id);
    const postIssue = usePostIssue();

    const [lines, setLines] = useState<LineItem[]>([]);
    const [warehouseId, setWarehouseId] = useState(activeScope?.warehouseId || '');
    const [scanLog, setScanLog] = useState<ScanEntry[]>([]);
    const [scanError, setScanError] = useState('');
    const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
    const [isWarehouseLockedError, setIsWarehouseLockedError] = useState(false);

    const [fefoOpen, setFefoOpen] = useState(false);
    const [activeLine, setActiveLine] = useState<LineItem | null>(null);

    const { data: lots = [] } = useLotsByItem({
        itemId: activeLine?.item?.id,
        warehouseId: warehouseId
    });

    const { data: lockState } = useWarehouseLock(warehouseId);

    useEffect(() => {
        if (activeScope?.warehouseId && !issue) {
            setWarehouseId(activeScope.warehouseId);
        }
    }, [activeScope?.warehouseId, issue]);

    useEffect(() => {
        if (issue) {
            // Synchronize internal state with fetched issue data
            setLines((issue.lines || []).map(l => ({
                id: l.id,
                item: l.item,
                qty: l.qty,
                uomId: l.uomId,
                lotAllocations: l.lotAllocations,
            })));

            setWarehouseId(issue.warehouseId || activeScope?.warehouseId || '');
        }
    }, [issue, activeScope?.warehouseId]);

    const handleScan = async (barcode: string) => {
        try {
            setScanError('');
            const ItemSchema = z.object({
                data: z.array(z.object({
                    id: z.string(), code: z.string(), name: z.string(), image: z.string().nullable().optional(),
                    primaryUom: z.object({ id: z.string(), code: z.string() })
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
                    targetLine = { id: `new-${Date.now()}`, item, qty: 1, uomId: item.primaryUom.id, lotAllocations: [] };
                    return [...prev, targetLine];
                });
                setScanLog(prev => [{ barcode, item_name: item.name, timestamp: new Date(), success: true }, ...prev].slice(0, 10));
                // Auto-open FEFO allocator for new scans
                setTimeout(() => {
                    if (targetLine) { setActiveLine(targetLine); setFefoOpen(true); }
                }, 100);
            } else {
                setScanLog(prev => [{ barcode, item_name: '', timestamp: new Date(), success: false }, ...prev].slice(0, 10));
                setScanError(t('no_item_found'));
                throw new Error('ItemNotFound');
            }
        } catch (err) {
            if (err instanceof Error && err.message === 'ItemNotFound') {
                throw err;
            }
            setScanLog(prev => [{ barcode, item_name: '', timestamp: new Date(), success: false }, ...prev].slice(0, 10));
            setScanError(t('no_item_found'));
            throw err;
        }
    };

    const handlePost = async () => {
        try {
            await postIssue.mutateAsync({
                id,
                confirmation: 'ACKNOWLEDGE_IRREVERSIBLE',
                version: issue?.version || 0
            });
            setIsPostDialogOpen(false);
            router.push("/issues");
        } catch (err: unknown) {
            const apiErr = err as { code?: string; message?: string };
            if (apiErr?.code === 'WAREHOUSE_LOCKED') {
                setIsWarehouseLockedError(true);
            } else {
                const message = err instanceof Error ? err.message : (apiErr?.message || 'Failed to post issue');
                toast.error(message);
            }
            setIsPostDialogOpen(false);
        }
    };

    const isPosted = isIssuePosted(issue?.status);
    const isLocked = (lockState?.isLocked ?? false) || isWarehouseLockedError;

    if (isLoading) return <div className="p-8 text-center text-muted-foreground font-mono">{t('scan_mode.loading')}</div>;

    return (
        <div className="bg-slate-950 text-slate-100 flex flex-col p-3 sm:p-5 space-y-5 w-full max-w-6xl mx-auto selection:bg-operational-cyan/30">
            {/* Immersive Header */}
            <div className="relative overflow-hidden bg-card/90 backdrop-blur-xl border border-operational-cyan/30 p-4 sm:p-5 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.1)] flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                <div className="absolute -top-20 -start-20 w-60 h-60 bg-operational-cyan/10 blur-[80px] rounded-full pointer-events-none" />
                <div className="relative z-10 min-w-0 flex-1">
                    <div className="flex items-center gap-2 px-3 py-1 bg-operational-cyan/10 border border-operational-cyan/30 rounded-full w-fit mb-1.5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-operational-cyan opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-operational-cyan"></span>
                        </span>
                        <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-operational-cyan">{t('scan_mode.title')}</span>
                    </div>
                    <h1 className="text-lg sm:text-2xl font-black font-mono tracking-tight text-white truncate max-w-full" dir="ltr">
                        {isNew ? t('create_new') : issue?.documentNumber}
                    </h1>
                </div>

                <div className="relative z-10 flex items-center gap-3 shrink-0 ms-auto">
                    <StatusBadge status={(issue?.status ?? 'DRAFT') as BadgeStatus} />
                    <Link href={`/issues/${id}`}>
                        <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-bold uppercase rounded-xl border-border hover:bg-surface-container hover:text-white transition-all flex items-center gap-1.5">
                            <X className="w-4 h-4" />
                            <span>{t('scan_mode.exit_mode')}</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {isLocked && <LockBanner lockState={lockState} />}

            {/* Scan Input Card & Scanned Items */}
            <div className="bg-card/90 backdrop-blur-xl border border-operational-cyan/20 p-4 sm:p-6 rounded-2xl shadow-2xl flex flex-col min-w-0 space-y-5">
                <ScanInput
                    onScan={handleScan}
                    disabled={isPosted || isLocked}
                    placeholder={t('scan_mode.ready_for_barcode')}
                    variant="retro"
                    size="lg"
                    scannerMode={true}
                    label={locale === 'ar' ? 'ماسح الباركود النشط' : 'ACTIVE BARCODE SCANNER'}
                />

                {scanError && (
                    <div className="flex items-center justify-center gap-2 text-status-error text-center p-3 rounded-xl bg-status-error/10 border border-status-error/30 text-sm font-black uppercase tracking-wider animate-bounce">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>{scanError}</span>
                    </div>
                )}

                {/* Scanned Items Header & Compact List */}
                <div className="flex flex-col min-w-0 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border/40">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-operational-cyan rounded-full" />
                            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground">
                                {locale === 'ar' ? 'الأصناف الممسوحة' : 'Scanned Items'}
                            </h3>
                        </div>
                        <div className="px-3 py-1 bg-surface-container-highest border border-border/50 rounded-full text-xs font-mono font-bold text-operational-cyan">
                            {lines.length} {t('entries')}
                        </div>
                    </div>

                    {lines.length > 0 ? (
                        <div className="space-y-2.5 overflow-y-auto max-h-[45vh] pe-1">
                            {lines.map(line => {
                                const totalAllocated = (line.lotAllocations || []).reduce((sum: number, a: LotAllocation) => sum + a.allocatedQty, 0);
                                const isFullyAllocated = totalAllocated >= line.qty;
                                const itemName = locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '');

                                return (
                                    <div key={line.id} className="bg-surface-container-high/80 border border-border/60 hover:border-operational-cyan/40 p-3 sm:p-4 rounded-xl shadow-sm transition-all flex items-center justify-between gap-3 group">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            {/* Item Image Thumbnail */}
                                            {line.item.image ? (
                                                <img
                                                    src={line.item.image}
                                                    alt={itemName}
                                                    className="w-11 h-11 object-cover rounded-xl border border-border/50 shrink-0 shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-11 h-11 rounded-xl bg-surface-container-highest border border-border/50 flex items-center justify-center text-xs font-mono font-bold text-muted-foreground shrink-0">
                                                    <Package className="w-5.5 h-5.5 text-operational-cyan/70" />
                                                </div>
                                            )}

                                            <div className="flex flex-col min-w-0 text-start">
                                                <span className="text-sm sm:text-base font-bold text-foreground group-hover:text-operational-cyan transition-colors truncate">
                                                    {itemName}
                                                </span>
                                                <span className="text-xs font-mono text-muted-foreground font-bold bg-surface-container-highest px-2 py-0.5 rounded w-fit border border-border/40 mt-0.5" dir="ltr">
                                                    {line.item.code}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 sm:gap-5 shrink-0 ms-auto">
                                            {/* Quantity Pill */}
                                            <div className="flex flex-col items-end px-2.5 py-1 bg-operational-cyan/10 border border-operational-cyan/30 rounded-lg">
                                                <span className="text-[8px] uppercase font-bold text-operational-cyan tracking-widest">{t('scan_mode.qty')}</span>
                                                <div className="text-sm font-black font-mono text-foreground flex items-center gap-1" dir="ltr">
                                                    <span>{line.qty}</span>
                                                    <RelationalName
                                                        name={line.item.primaryUom?.code}
                                                        rawId={line.uomId}
                                                        fallback="---"
                                                        className="text-[10px] font-bold text-operational-cyan uppercase"
                                                    />
                                                </div>
                                            </div>

                                            {/* FEFO Lot Allocation Button */}
                                            <Button
                                                type="button"
                                                className={cn(
                                                    "h-9 px-3 sm:px-4 text-xs font-extrabold uppercase rounded-xl border-2 transition-all flex items-center gap-1.5 shrink-0",
                                                    isFullyAllocated
                                                        ? "border-operational-cyan/60 text-operational-cyan bg-operational-cyan/10 hover:bg-operational-cyan hover:text-white"
                                                        : "border-status-error/60 text-status-error bg-status-error/10 hover:bg-status-error hover:text-white animate-pulse"
                                                )}
                                                onClick={() => { setActiveLine(line); setFefoOpen(true); }}
                                                disabled={isPosted}
                                            >
                                                {isFullyAllocated ? (
                                                    <>
                                                        <span>{t('scan_mode.allocated_status')}</span>
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>{t('scan_mode.pending_lots_status')}</span>
                                                        <AlertTriangle className="w-4 h-4" />
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground/60 space-y-2">
                            <div className="w-14 h-14 rounded-2xl bg-operational-cyan/10 border border-operational-cyan/20 flex items-center justify-center text-operational-cyan shadow-inner mb-1">
                                <Barcode className="w-7 h-7" />
                            </div>
                            <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">{t('scan_mode.awaiting_first_scan')}</h4>
                            <p className="text-xs text-muted-foreground max-w-sm">{t('scan_mode.ready_for_barcode')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Scan Log */}
            {scanLog.length > 0 && (
                <div className="bg-card/90 backdrop-blur-xl border border-border/60 p-4 sm:p-5 rounded-2xl shadow-inner">
                    <h3 className="text-xs text-foreground/60 mb-3 uppercase font-extrabold tracking-wider">{t('scan_log_title')}</h3>
                    <ScanLog entries={scanLog} />
                </div>
            )}

            {/* Footer Actions */}
            {!isPosted && (
                <div className="flex gap-3 pt-2 pb-6">

                    <Button
                        className="flex-1 h-11 bg-operational-cyan text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:bg-operational-cyan/90 transition-all flex items-center justify-center gap-2"
                        disabled={isLocked || lines.length === 0}
                        onClick={() => setIsPostDialogOpen(true)}
                    >
                        <Send className="w-4 h-4" />
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
                <DialogContent className="max-h-[90vh] max-w-2xl bg-surface-container border border-border-muted/50 overflow-y-auto rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-extrabold uppercase text-foreground">{t('fefo_drawer_title')}: {activeLine?.item.name}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 overflow-y-auto pb-20">
                        {activeLine && (
                            <FEFOLotAllocator
                                lots={lots as Lot[]}
                                requestedQty={activeLine.qty}
                                uomLabel={activeLine.item.primaryUom?.code || activeLine.uomId || ''}
                                userRole={user?.role}
                                onAllocate={(allocations) => {
                                    setLines(prev => prev.map(l => l.id === activeLine.id ? {
                                        ...l, lotAllocations: allocations
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
