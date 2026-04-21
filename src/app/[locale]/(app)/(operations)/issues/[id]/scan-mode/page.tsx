'use client';

import { use, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
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
import type { BadgeStatus } from '@/components/shared/StatusBadge';
import Link from 'next/link';
import type { LotAllocation } from '@/types/documents';

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
      setLines((issue.lines || []) as unknown as LineItem[]);
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
          targetLine = { id: `new-${Date.now()}`, item, qty: 1, uom_id: item.primary_uom.id, lot_allocations: [] };
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
      await postIssue.mutateAsync({ confirmation: 'ACKNOWLEDGE_IRREVERSIBLE' });
      setIsPostDialogOpen(false);
      router.push(`/${locale}/issues`);
    } catch (err: unknown) {
      const apiErr = err as { code?: string };
      if (apiErr?.code === 'WAREHOUSE_LOCKED') setIsWarehouseLockedError(true);
      setIsPostDialogOpen(false);
    }
  };

  const isPosted = issue?.status === 'POSTED';
  const isLocked = (lockState?.is_locked ?? false) || isWarehouseLockedError;

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-surface-1 flex flex-col p-4 space-y-4">
      {/* Immersive Header */}
      <div className="flex justify-between items-center bg-surface-2 p-4 rounded-xl border border-surface-3 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold">{isNew ? t('create_new') : issue?.document_number}</h1>
          <span className="text-neon-cyan/70 text-sm">Scan Mode</span>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={(issue?.status ?? 'DRAFT') as BadgeStatus} />
          <Link href={`/${locale}/issues/${id}`}>
             <Button variant="outline" size="sm">Exit Scan Mode</Button>
          </Link>
        </div>
      </div>

      {(isLocked) && <LockBanner lockState={lockState} />}

      {/* Massive Scan Input for Tablets */}
      <div className="bg-surface-2 p-6 rounded-xl border border-surface-3 shadow-lg flex-1 flex flex-col">
          <ScanInput 
             onScan={handleScan} 
             disabled={isPosted || isLocked} 
             placeholder="SCAN BARCODE..." 
             className="text-3xl py-6 font-mono text-center border-2"
          />
          {scanError && <div className="text-neon-red text-center mt-4 text-xl">{scanError}</div>}
          
          <div className="mt-8 flex-1 overflow-auto">
             {lines.length > 0 ? (
               <div className="space-y-4">
                 {lines.map(line => {
                   const totalAllocated = (line.lot_allocations || []).reduce((sum: number, a: LotAllocation) => sum + a.allocated_qty, 0);
                   const isFullyAllocated = totalAllocated >= line.qty;
                   
                   return (
                     <div key={line.id} className="bg-surface-1 border border-surface-3 p-4 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-xl font-bold">{line.item.name_ar} / {line.item.name_en}</div>
                          <div className="text-muted-foreground text-sm font-mono">{line.item.code}</div>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="text-center">
                             <div className="text-sm text-muted-foreground">Qty</div>
                             <div className="text-2xl font-bold">{line.qty} {line.item.primary_uom.code}</div>
                           </div>
                           <button 
                             className={`px-4 py-2 rounded-lg border-2 font-bold ${isFullyAllocated ? 'border-neon-cyan text-neon-cyan' : 'border-neon-red text-neon-red animate-pulse'}`}
                             onClick={() => { setActiveLine(line); setFefoOpen(true); }}
                             disabled={isPosted}
                           >
                             {isFullyAllocated ? `${totalAllocated} Allocated✓` : `${totalAllocated}/${line.qty} Pending`}
                           </button>
                        </div>
                     </div>
                   );
                 })}
               </div>
             ) : (
                <div className="flex h-full items-center justify-center flex-col text-muted-foreground">
                   <div className="text-6xl mb-4">📦</div>
                   <div className="text-2xl">Awaiting First Scan</div>
                </div>
             )}
          </div>
      </div>

      {/* Scan Log */}
      {scanLog.length > 0 && (
        <div className="bg-surface-2 p-4 rounded-xl border border-surface-3">
          <h3 className="text-xs text-on-surface-muted mb-2 uppercase tracking-wider">{t('scan_log_title')}</h3>
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
            className="flex-1 bg-neon-cyan text-surface-0 hover:bg-neon-cyan/80"
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
        <DialogContent className="max-h-[90vh] max-w-2xl bg-surface-1 border border-surface-3 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{t('fefo_drawer_title')}: {activeLine?.item.name_en}</DialogTitle>
          </DialogHeader>
          <div className="py-4 overflow-y-auto pb-20">
            {activeLine && (
              <FEFOLotAllocator
                lots={lots as any}
                requestedQty={activeLine.qty}
                uomLabel={activeLine.item.primary_uom.code}
                userRole={user?.role || 'WH_KEEPER'}
                onAllocate={(allocations) => {
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
