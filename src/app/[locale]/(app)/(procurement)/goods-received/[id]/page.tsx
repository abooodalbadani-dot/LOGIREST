'use client';

import { use, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { FXRateCapture } from '@/components/shared/FXRateCapture';
import { FEFOLotAllocator } from '@/components/shared/FEFOLotAllocator/FEFOLotAllocator';
import { LockBanner } from '@/components/shared/LockBanner';
import { useGRN, GRNDetail } from '@/features/purchasing/hooks/useGRN';
import { usePostGRN } from '@/features/purchasing/hooks/usePostGRN';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { useAuth } from '@/providers/AuthProvider';

export default function GRNDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = use(props.params);
  const { locale, id } = params;
  const t = useTranslations('procurement.grn');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const isNew = id === 'new';
  const { data: grn, isLoading: isLoadingGRN } = useGRN(isNew ? null : id);
  const postGRN = usePostGRN(id);
  
  const [lines, setLines] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [currencyId, setCurrencyId] = useState('SAR');
  const [warehouseId, setWarehouseId] = useState('wh-1');
  const [notes, setNotes] = useState('');
  const [scanError, setScanError] = useState('');
  
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [fxRate, setFxRate] = useState<number>(1);
  const [isWarehouseLockedError, setIsWarehouseLockedError] = useState(false);
  
  // FEFO Allocator State
  const [fefoOpen, setFefoOpen] = useState(false);
  const [activeLine, setActiveLine] = useState<any | null>(null);
  const [lots, setLots] = useState<any[]>([]);

  // Lock Banner state
  const { data: lockState } = useWarehouseLock(warehouseId);

  useEffect(() => {
    if (grn) {
      setLines(grn.lines || []);
      setSupplierId(grn.supplier_id || '');
      setCurrencyId(grn.currency_id || 'SAR');
      setWarehouseId(grn.warehouse_id || 'wh-1');
      setNotes(grn.notes || '');
    }
  }, [grn]);

  const handleScan = async (barcode: string) => {
    try {
      setScanError('');
      const ItemSchema = z.object({
        data: z.array(z.object({
          id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string(),
          primary_uom: z.object({ id: z.string(), code: z.string() })
        }))
      });
      // The mock should return something, we use items for simplicity
      const res = await apiClient.get(`/master-data/items?barcode=${barcode}`, ItemSchema);
      if (res.data && res.data.length > 0) {
        const item = res.data[0];
        setLines(prev => {
          const existing = prev.find(l => l.item.id === item.id);
          if (existing) {
            return prev.map(l => l.item.id === item.id ? { ...l, qty: l.qty + 1, received_qty: l.received_qty + 1 } : l);
          }
          return [...prev, {
            id: `new-${Date.now()}`,
            document_id: id,
            item_id: item.id,
            item: item,
            lot_id: null,
            lot: null,
            qty: 1,
            received_qty: 1,
            uom_id: item.primary_uom.id,
            unit_cost_foreign: 0,
            unit_cost_base: 0
          }];
        });
      } else {
        setScanError(t('no_item_found'));
      }
    } catch(err) {
      setScanError(t('no_item_found'));
    }
  };

  const removeLine = (lineId: string) => {
    setLines(prev => prev.filter(l => l.id !== lineId));
  };
  
  const handleLotClick = async (line: any) => {
    try {
      const LotResponseSchema = z.object({
        data: z.array(z.any())
      });
      const res = await apiClient.get(`/inventory/lots-available?item_id=${line.item.id}&warehouse_id=${warehouseId}`, LotResponseSchema);
      setLots(res.data || []);
      setActiveLine(line);
      setFefoOpen(true);
    } catch(err) {
      console.error(err);
    }
  };

  const isPosted = grn?.status === 'POSTED';
  const isLocked = lockState?.is_locked ?? false;

  const handlePost = async () => {
    try {
      await postGRN.mutateAsync({ fx_rate: fxRate, confirmation: 'ACKNOWLEDGE_IRREVERSIBLE' });
      setIsPostDialogOpen(false);
      router.push(`/${locale}/goods-received`);
    } catch (err: any) {
      if (err?.code === 'WAREHOUSE_LOCKED') {
        setIsWarehouseLockedError(true);
        setIsPostDialogOpen(false);
      }
    }
  };

  if (isLoadingGRN) return <div>Loading...</div>;

  return (
    <div className="space-y-6 pb-20">
      <PageHeader 
        title={isNew ? t('create_new') : t('detail_title')}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" disabled={isPosted || isLocked}>{t('save_draft')}</Button>
            <div title={isLocked ? t('warehouse_locked') : undefined}>
              <Button 
                disabled={isPosted || isLocked}
                onClick={() => setIsPostDialogOpen(true)}
              >{t('post_grn')}</Button>
            </div>
          </div>
        }
      />
      {(isLocked || isWarehouseLockedError) && <LockBanner lockState={lockState} />}
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface-1 p-4 rounded-lg border border-surface-3">
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Supplier</label>
          <select value={supplierId} onChange={e => setSupplierId(e.target.value)} disabled={isPosted} className="w-full bg-surface-2 border border-surface-3 rounded p-2">
            <option value="">Select...</option>
            <option value="sup-1">Supply Co</option>
            <option value="sup-2">Other Co</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Currency</label>
          <select value={currencyId} onChange={e => setCurrencyId(e.target.value)} disabled={isPosted} className="w-full bg-surface-2 border border-surface-3 rounded p-2">
            <option value="SAR">SAR</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Status</label>
          <div className="py-2"><StatusBadge status={grn?.status as any || 'DRAFT'} /></div>
        </div>
        <div className="col-span-2 md:col-span-4">
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
             onError={(bc) => setScanError(t('no_item_found') + ': ' + bc)}
          />
          {scanError && <div className="text-neon-red text-sm">{scanError}</div>}
          
          <DocumentLineItemTable 
             lines={lines} 
             locale={locale as 'ar' | 'en'}
             isReadOnly={isPosted}
             onRemoveLine={removeLine}
             extraColumns={[
               {
                 header: 'Received Qty',
                 cell: (line: any) => (
                   <input type="number" 
                     className="w-20 bg-surface-2 border border-surface-3 rounded text-center px-2 py-1"
                     value={line.received_qty} 
                     disabled={isPosted}
                     onChange={e => {
                       const val = Number(e.target.value);
                       setLines(prev => prev.map(l => l.id === line.id ? { ...l, received_qty: val, qty: val } : l));
                     }} 
                   />
                 )
               },
               {
                 header: 'Lot',
                 cell: (line: any) => (
                   <button 
                     type="button" 
                     className="text-neon-cyan underline decoration-dotted text-sm"
                     onClick={() => handleLotClick(line)}
                     disabled={isPosted}
                   >
                     {line.lot ? line.lot.lot_number : 'Allocate Lot'}
                   </button>
                 )
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
        warningText={t('post_irreversible')}
        requiresTextConfirmation={true}
        onConfirm={handlePost}
        isLoading={postGRN.isPending}
      >
        {currencyId !== 'SAR' && (
           <FXRateCapture 
             fromCurrencyCode={currencyId} 
             toCurrencyCode="SAR" 
             onRateConfirmed={setFxRate} 
           />
        )}
      </PostConfirmDialog>

      <Sheet open={fefoOpen} onOpenChange={setFefoOpen}>
        <SheetContent side="bottom" className="h-[80vh] bg-surface-1 border-t border-surface-3">
          <SheetHeader>
            <SheetTitle>FEFO Lot Allocation</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            {activeLine && (
              <FEFOLotAllocator
                lots={lots}
                requestedQty={activeLine.received_qty}
                uomLabel={activeLine.item.primary_uom.code}
                userRole={user?.role || 'WH_KEEPER'}
                onAllocate={(allocations) => {
                  // In a real app we'd map allocations to the line item. Here we just take the first lot.
                  if (allocations.length > 0) {
                    const alloc = allocations[0];
                    setLines(prev => prev.map(l => l.id === activeLine.id ? {
                      ...l, lot: { id: alloc.lot_id, lot_number: alloc.lot_number, expiry_date: alloc.expiry_date }
                    } : l));
                  }
                  setFefoOpen(false);
                }}
                onClose={() => setFefoOpen(false)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
