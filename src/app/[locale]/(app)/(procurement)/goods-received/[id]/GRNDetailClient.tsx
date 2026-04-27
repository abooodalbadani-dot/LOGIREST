'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/auth/Can';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { FXRateCapture } from '@/components/shared/FXRateCapture';
import { FEFOLotAllocator } from '@/components/shared/FEFOLotAllocator/FEFOLotAllocator';
import { LockBanner } from '@/components/shared/LockBanner';
import { useGRN, type GRNDetail, LineItemSchema } from '@/features/purchasing/hooks/useGRN';
import { usePostGRN } from '@/features/purchasing/hooks/usePostGRN';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/AuthProvider';
import { useCurrencies } from '@/features/purchasing/hooks/useCurrencies';
import { useFXRates } from '@/features/purchasing/hooks/useFXRates';
import { Label } from '@/components/ui/label';
import { StatusTimeline, type Status } from '@/components/shared/StatusTimeline';
import { type Lot } from '@/types/master-data';
import { Save, Send, Wallet, TrendingUp, History, PackageSearch, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const grnHeaderSchema = z.object({
  supplier_id: z.string().min(1, 'Required'),
  currency_id: z.string().min(1, 'Required'),
  warehouse_id: z.string().min(1, 'Required'),
  notes: z.string().optional(),
});

type GRNHeaderFormValues = z.infer<typeof grnHeaderSchema>;
type LineItem = z.infer<typeof LineItemSchema>;

interface GRNDetailClientProps {
  id: string;
  locale: 'ar' | 'en';
}

export function GRNDetailClient({ id: idParam, locale }: GRNDetailClientProps) {
  const t = useTranslations('procurement.grn');
  const tc = useTranslations('common');
  const router = useRouter();
  const { user } = useAuth();
  
  const id = idParam;
  const isNew = id === 'new';
  const { data: grn, isLoading: isLoadingGRN } = useGRN(isNew ? null : id);
  const postGRN = usePostGRN(id);
  const { data: currencies } = useCurrencies();
  
  const baseCurrency = currencies?.find(c => c.is_base)?.code || 'SAR';
  
  const [lines, setLines] = useState<LineItem[]>([]);
  const [scanError, setScanError] = useState('');
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [fxRate, setFxRate] = useState<number>(1);
  const [isWarehouseLockedError, setIsWarehouseLockedError] = useState(false);
  
  // FEFO Allocator State
  const [fefoOpen, setFefoOpen] = useState(false);
  const [activeLine, setActiveLine] = useState<LineItem | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<GRNHeaderFormValues>({
    resolver: zodResolver(grnHeaderSchema),
    defaultValues: {
      supplier_id: '',
      currency_id: 'SAR',
      warehouse_id: 'wh-1',
      notes: '',
    }
  });

  const currencyId = watch('currency_id');
  const warehouseId = watch('warehouse_id');

  // Lock Banner state
  const { data: lockState } = useWarehouseLock(warehouseId);

  // Live FX conversion logic
  const { data: fxRates } = useFXRates(currencyId, baseCurrency);
  const currentFxRate = fxRates?.[0]?.rate || 1;

  const totalForeign = useMemo(() => {
    return lines.reduce((acc, line) => acc + (line.received_qty * (line.unit_cost_foreign || 0)), 0);
  }, [lines]);

  useEffect(() => {
    if (grn) {
      reset({
        supplier_id: grn.supplier_id || '',
        currency_id: grn.currency_id || 'SAR',
        warehouse_id: grn.warehouse_id || 'wh-1',
        notes: grn.notes || '',
      });
      setLines(grn.lines || []);
    }
  }, [grn, reset]);

  const handleScan = async (barcode: string) => {
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
  
  const handleLotClick = async (line: LineItem) => {
    try {
      const { LotSchema } = await import('@/types/master-data');
      const LotResponseSchema = z.object({
        data: z.array(LotSchema)
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
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error?.code === 'WAREHOUSE_LOCKED') {
        setIsWarehouseLockedError(true);
        setIsPostDialogOpen(false);
      }
    }
  };

  if (isLoadingGRN) return (
    <div className="flex flex-col h-[60vh] items-center justify-center bg-surface-container-low shadow-xl rounded-2xl animate-pulse">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-primary tracking-tighter uppercase">GRN</div>
      </div>
      <p className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 animate-pulse">{t('initializing_context')}</p>
    </div>
  );

  const mockTimeline = grn ? [
    { status: grn.status.toLowerCase() as Status, at: new Date().toISOString(), by: user?.name || 'System User' }
  ] : [];

  return (
    <div className="flex flex-col gap-10 relative pb-20">
      <PageHeader
        title={isNew ? t('create_new') : `#${grn?.document_number}`}
        description={isNew ? t('new_manifest_sub') : t('detail_sub')}
        showStatus={!isNew}
        status={grn?.status as BadgeStatus}
        actions={
          <div className="flex items-center gap-3">
            <Can perform={isNew ? "create" : "edit"} on="grn">
              {!isPosted && (
                <Button 
                  variant="outline" 
                  disabled={isLocked}
                  className="h-11 px-6 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
                >
                  <Save className="w-4 h-4 me-2 rtl:ms-2 rtl:me-0 opacity-60" />
                  {t('save_draft')}
                </Button>
              )}
            </Can>
            <Can perform="post" on="grn">
              {!isPosted && (
                <Button 
                  disabled={isLocked}
                  onClick={() => setIsPostDialogOpen(true)}
                  className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-all rounded-2xl"
                >
                  <Send className="w-4 h-4 me-2 rtl:ms-2 rtl:me-0" />
                  {t('post_grn')}
                </Button>
              )}
            </Can>
          </div>
        }
      />
      {(isLocked || isWarehouseLockedError) && <LockBanner lockState={lockState} />}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Supplier Selector */}
        <div className="bg-surface-container-low p-6 rounded-2xl shadow-sm flex flex-col gap-1 transition-all hover:bg-surface-container-medium group relative overflow-hidden">
          <Label htmlFor="supplier-select" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 group-hover:text-cyan-500/60 transition-colors">{tc('supplier')}</Label>
          {isPosted ? (
             <p className="font-bold text-lg tracking-tight mt-2">Supply Co</p>
          ) : (
            <>
              <select 
                id="supplier-select"
                {...register('supplier_id')}
                className="mt-2 p-3 bg-surface-container-highest rounded-2xl focus:ring-1 focus:ring-primary/50 outline-none transition-all text-sm font-medium"
              >
                <option value="">{tc('select_supplier')}</option>
                <option value="sup-1">Supply Co</option>
                <option value="sup-2">Other Co</option>
              </select>
              {errors.supplier_id && <span className="text-[10px] text-destructive mt-1 font-bold">{errors.supplier_id.message}</span>}
            </>
          )}
        </div>

        {/* Currency Selector */}
        <div className="bg-surface-container-low p-6 rounded-2xl shadow-sm flex flex-col gap-1 transition-all hover:bg-surface-container-medium group relative overflow-hidden">
          <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
            <Wallet className="w-12 h-12" />
          </div>
          <Label htmlFor="currency-select" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 group-hover:text-cyan-500/60 transition-colors">{tc('order_currency')}</Label>
          {isPosted ? (
             <p className="font-mono font-bold text-lg tracking-tight text-cyan-500 mt-2">{grn?.currency_id}</p>
          ) : (
            <>
              <select 
                id="currency-select"
                {...register('currency_id')}
                className="mt-2 p-3 bg-surface-container-highest rounded-2xl focus:ring-1 focus:ring-primary/50 outline-none transition-all text-sm font-medium font-mono"
              >
                <option value="SAR">{tc('currencies.sar_full')}</option>
                <option value="USD">{tc('currencies.usd_full')}</option>
              </select>
              {errors.currency_id && <span className="text-[10px] text-destructive mt-1 font-bold">{errors.currency_id.message}</span>}
            </>
          )}
        </div>

        {/* Linked PO */}
        <div className="bg-surface-container-low p-6 rounded-2xl shadow-sm flex flex-col gap-1 transition-all hover:bg-surface-container-medium group relative overflow-hidden">
          <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
            <PackageSearch className="w-12 h-12" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 group-hover:text-cyan-500/60 transition-colors">{tc('ref_document')}</p>
          <div className="mt-2">
            {grn?.po_number ? (
              <Badge variant="outline" className="h-8 px-4 bg-cyan-500/10 text-cyan-500 border-cyan-500/30 text-[10px] font-black uppercase tracking-tighter">
                <span dir="ltr" className="font-mono">{grn.po_number}</span>
              </Badge>
            ) : (
              <p className="font-bold text-lg text-muted-foreground/30 tracking-tighter italic uppercase">{t('direct_receipt')}</p>
            )}
          </div>
        </div>

        {/* Warehouse */}
        <div className="bg-surface-container-low p-6 rounded-2xl shadow-sm flex flex-col gap-1 transition-all hover:bg-surface-container-medium group relative overflow-hidden">
           <Label htmlFor="warehouse-select" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 group-hover:text-cyan-500/60 transition-colors">{tc('warehouse')}</Label>
           {isPosted ? (
              <p className="font-bold text-lg tracking-tight mt-2">Main Warehouse</p>
           ) : (
             <>
               <select 
                 id="warehouse-select"
                 {...register('warehouse_id')}
                 className="mt-2 p-3 bg-surface-container-highest rounded-2xl focus:ring-1 focus:ring-primary/50 outline-none transition-all text-sm font-medium"
               >
                 <option value="wh-1">Main Warehouse</option>
                 <option value="wh-2">Kitchen Store</option>
               </select>
               {errors.warehouse_id && <span className="text-[10px] text-destructive mt-1 font-bold">{errors.warehouse_id.message}</span>}
             </>
           )}
        </div>

        <div className="col-span-full bg-surface-container-low p-6 rounded-2xl shadow-sm flex flex-col gap-1 transition-all hover:bg-surface-container-medium group relative overflow-hidden">
          <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
            <MessageSquare className="w-12 h-12" />
          </div>
          <Label htmlFor="notes-area" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 group-hover:text-cyan-500/60 transition-colors">{tc('notes')}</Label>
          <textarea 
            id="notes-area"
            {...register('notes')}
            disabled={isPosted} 
            className="mt-2 w-full bg-surface-container-highest rounded-2xl p-4 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-sm font-medium min-h-[100px]" 
            placeholder={tc('notes_placeholder')} 
          />
        </div>
      </div>

      <DocumentReadOnlyOverlay isPosted={isPosted}>
        <div className="space-y-6">
          <ScanInput 
             onScan={handleScan} 
             disabled={isPosted} 
             placeholder={t('scan_placeholder')} 
             onError={(bc) => setScanError(t('no_item_found') + ': ' + bc)}
             className="bg-surface-container-low border-white/5 rounded-2xl"
          />
          {scanError && <div dir="ltr" className="text-destructive text-[10px] font-black uppercase tracking-widest">{scanError}</div>}
          
          <DocumentLineItemTable<LineItem> 
             lines={lines} 
             locale={locale as 'ar' | 'en'}
             isReadOnly={isPosted}
             onRemoveLine={removeLine}
             extraColumns={[
               {
                 header: tc('table_headers.received_qty'),
                 cell: (line: LineItem) => isPosted ? (
                    <span dir="ltr" className="font-mono font-bold text-foreground/80">{line.received_qty}</span>
                 ) : (
                    <input type="number" 
                      dir="ltr"
                      className="w-20 bg-surface-container-highest rounded-2xl text-center px-2 py-1.5 font-mono text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
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
                 header: tc('table_headers.lot_allocation'),
                 cell: (line: LineItem) => (
                   <button 
                     type="button" 
                     className="text-primary underline underline-offset-4 decoration-dotted decoration-primary/40 hover:decoration-primary text-[10px] font-black uppercase tracking-tighter transition-all"
                     onClick={() => handleLotClick(line)}
                     disabled={isPosted}
                   >
                     {line.lot ? (
                       <span dir="ltr" className="font-mono">{line.lot.lot_number}</span>
                     ) : t('allocate_lot')}
                   </button>
                 )
               }
             ]}
          />
        </div>
      </DocumentReadOnlyOverlay>

      {/* Financial Summary */}
      <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-8">
        <div className="flex flex-col items-end gap-1 px-6 border-e border-white/5">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">{t('market_index_ref')}</p>
           <div className="flex items-center gap-2 text-cyan-500">
             <TrendingUp className="w-3 h-3" />
             <p dir="ltr" className="text-xs font-mono font-black">1 {currencyId} = {currentFxRate} {baseCurrency}</p>
           </div>
        </div>

        <div className="bg-surface-container-high p-8 rounded-2xl shadow-2xl relative overflow-hidden min-w-[340px] group">
          <div className="absolute top-0 end-0 w-1 h-full bg-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]" />
          
          <div className="space-y-6 relative z-10">
            <div className="flex justify-between items-baseline gap-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('receipt_total', { currency: currencyId })}</p>
              <p dir="ltr" className="text-4xl font-display font-black tracking-tighter text-foreground">{totalForeign.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            
            <div className="h-px bg-white/5 w-full" />
            
            <div className="flex justify-between items-center gap-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/40">{t('base_value', { currency: baseCurrency })}</p>
              <p dir="ltr" className="text-xl font-mono font-black text-cyan-500/80">{(totalForeign * currentFxRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {mockTimeline.length > 0 && (
        <div className="bg-surface-container-low p-8 rounded-2xl shadow-lg transition-all hover:bg-surface-container-medium/50">
          <div className="flex items-center gap-3 mb-10">
            <History className="w-4 h-4 text-primary opacity-40" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40">{tc('audit_trail')}</h3>
          </div>
          <StatusTimeline entries={mockTimeline} />
        </div>
      )}

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
        <SheetContent side="bottom" className="h-[80vh] bg-surface-container-lowest border-t border-primary/30 rounded-t-[32px]">
          <SheetHeader>
            <SheetTitle className="text-xl font-display font-black tracking-tighter">{t('fefo_allocation')}</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            {activeLine && (
              <FEFOLotAllocator
                lots={lots}
                requestedQty={activeLine.received_qty}
                uomLabel={activeLine.item.primary_uom.code}
                userRole={user?.role || 'WH_KEEPER'}
                onAllocate={(allocations) => {
                  if (allocations.length > 0) {
                    const alloc = allocations[0];
                    setLines(prev => prev.map(l => l.id === activeLine.id ? {
                      ...l, lot: { id: alloc.lot_id, lot_number: alloc.lot_number, expiry_date: alloc.expiry_date ?? null }
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
