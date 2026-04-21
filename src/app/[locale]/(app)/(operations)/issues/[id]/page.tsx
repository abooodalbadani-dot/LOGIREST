'use client';

import { use, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { FEFOLotAllocator } from '@/components/shared/FEFOLotAllocator/FEFOLotAllocator';
import { LockBanner } from '@/components/shared/LockBanner';
import { useIssue } from '@/features/operations/hooks/useIssue';
import { usePostIssue } from '@/features/operations/hooks/usePostIssue';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { useLotsByItem } from '@/features/operations/hooks/useLotsByItem';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/providers/AuthProvider';
import type { LotAllocation } from '@/types/documents';
import type { BadgeStatus } from '@/components/shared/StatusBadge';

type LineItem = {
  id: string;
  item: { id: string; code: string; name_ar: string; name_en: string; primary_uom: { id: string; code: string; name_ar: string; name_en: string } };
  qty: number;
  uom_id: string;
  lot_allocations: LotAllocation[];
};

export default function IssueDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = use(props.params);
  const { locale, id } = params;
  const t = useTranslations('operations.issue');
  const router = useRouter();
  const { user } = useAuth();
  
  const isNew = id === 'new';
  const { data: issue, isLoading } = useIssue(isNew ? null : id);
  const postIssue = usePostIssue(id);
  
  const [lines, setLines] = useState<LineItem[]>([]);
  const [destinationId, setDestinationId] = useState('');
  const [warehouseId, setWarehouseId] = useState('wh-1');
  const [notes, setNotes] = useState('');
  const [scanError, setScanError] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [isWarehouseLockedError, setIsWarehouseLockedError] = useState(false);

  
  // FEFO Allocator State
  const [fefoOpen, setFefoOpen] = useState(false);
  const [activeLine, setActiveLine] = useState<LineItem | null>(null);

  // Auto fetch lots when activeLine changes
  const { data: lots = [] } = useLotsByItem({ 
    item_id: activeLine?.item?.id, 
    warehouse_id: warehouseId 
  });

  // Lock Banner state
  const { data: lockState } = useWarehouseLock(warehouseId);

  useEffect(() => {
    if (issue) {
      setLines((issue.lines || []) as unknown as LineItem[]);
      setDestinationId(issue.destination_dept_id ?? issue.destination_department_id ?? '');
      setRequestedBy(issue.requested_by ?? '');
      setWarehouseId(issue.warehouse_id || 'wh-1');
      setNotes(issue.notes || '');
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
        setLines(prev => {
          const existing = prev.find(l => l.item.id === item.id);
          if (existing) {
            return prev.map(l => l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l);
          }
          return [...prev, {
            id: `new-${Date.now()}`,
            item,
            qty: 1,
            uom_id: item.primary_uom.id,
            lot_allocations: []
          }];
        });
      } else {
        setScanError(t('no_item_found'));
      }
    } catch {
      setScanError(t('no_item_found'));
    }
  };

  const removeLine = (lineId: string) => {
    setLines(prev => prev.filter(l => l.id !== lineId));
  };

  const handleLotClick = (line: LineItem) => {
    setActiveLine(line);
    setFefoOpen(true);
  };

  const isPosted = issue?.status === 'POSTED';
  const isLocked = lockState?.is_locked ?? false;

  const handlePost = async () => {
    try {
      await postIssue.mutateAsync({ confirmation: 'ACKNOWLEDGE_IRREVERSIBLE' });
      setIsPostDialogOpen(false);
      router.push(`/${locale}/issues`);
    } catch (err: unknown) {
      const apiErr = err as { code?: string };
      if (apiErr?.code === 'WAREHOUSE_LOCKED') {
        setIsWarehouseLockedError(true);
        setIsPostDialogOpen(false);
      }
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6 pb-20">
      <PageHeader 
        title={isNew ? t('create_new') : t('detail_title')}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" disabled={isPosted || isLocked}>{t('save_draft')}</Button>
            <div title={isLocked ? "Cannot post: Warehouse is locked due to an active stocktake." : undefined}>
              <Button 
                 disabled={isPosted || isLocked || isNew}
                 onClick={() => setIsPostDialogOpen(true)}
              >{t('post_issue')}</Button>
            </div>
          </div>
        }
      />
      {(isLocked || isWarehouseLockedError) && <LockBanner lockState={lockState} />}
      
      <div className="grid grid-cols-2 gap-4 bg-surface-1 p-4 rounded-lg border border-surface-3">
        <div>
          <label className="text-sm text-muted-foreground block mb-1">{t('destination')}</label>
          <select value={destinationId} onChange={e => setDestinationId(e.target.value)} disabled={isPosted} className="w-full bg-surface-2 border border-surface-3 rounded p-2">
            <option value="">Select...</option>
            <option value="dep-1">Kitchen 1</option>
            <option value="dep-2">Pastry</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Status</label>
          <div className="py-2"><StatusBadge status={issue?.status as any || 'DRAFT'} /></div>
        </div>
        <div className="col-span-2">
          <label className="text-sm text-muted-foreground block mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={isPosted} className="w-full bg-surface-2 border border-surface-3 rounded p-2" rows={2} />
        </div>
      </div>

      <DocumentReadOnlyOverlay isPosted={isPosted}>
        <div className="space-y-4">
          <ScanInput 
             onScan={handleScan} 
             disabled={isPosted} 
             placeholder={t('scan_placeholder')} 
             onError={(bc) => setScanError('Not found: ' + bc)}
          />
          {scanError && <div className="text-neon-red text-sm">{scanError}</div>}
          
          <DocumentLineItemTable 
             lines={lines} 
             locale={locale as 'ar' | 'en'}
             isReadOnly={isPosted}
             onRemoveLine={removeLine}
             extraColumns={[
               {
                 header: 'Qty',
                 cell: (line: any) => (
                   <input type="number" 
                     className="w-20 bg-surface-2 border border-surface-3 rounded text-center px-2 py-1"
                     value={line.qty} 
                     disabled={isPosted}
                     onChange={e => {
                       const val = Number(e.target.value);
                       setLines(prev => prev.map(l => l.id === line.id ? { ...l, qty: val } : l));
                     }} 
                   />
                 )
               },
               {
                 header: 'Lot Allocations',
                  cell: (line: any) => {
                    const totalAllocated = (line.lot_allocations || []).reduce((sum: number, a: any) => sum + a.allocated_qty, 0);
                    return (
                     <button 
                       type="button" 
                       className={`underline decoration-dotted text-sm ${totalAllocated < line.qty ? 'text-neon-red' : 'text-neon-cyan'}`}
                       onClick={() => handleLotClick(line)}
                       disabled={isPosted}
                     >
                       {line.lot_allocations?.length > 0 
                         ? `${totalAllocated} / ${line.qty} Alloc` 
                         : 'Allocate Lot'}
                     </button>
                   );
                 }
               }
             ]}
          />
        </div>
      </DocumentReadOnlyOverlay>

      <PostConfirmDialog 
        open={isPostDialogOpen} 
        onOpenChange={setIsPostDialogOpen}
        title={t('post_confirm_title')}
        description={t('post_confirm_desc')}
        warningText=""
        requiresTextConfirmation={true}
        onConfirm={handlePost}
        isLoading={postIssue.isPending}
      />

      <Dialog open={fefoOpen} onOpenChange={setFefoOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl bg-surface-1 border border-surface-3 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('fefo_drawer_title')}: {activeLine?.item.name_en}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
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
