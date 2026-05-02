'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/PermissionGate';
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
import { Save, Send, Wallet, TrendingUp, History, PackageSearch, MessageSquare, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

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
 const [isWarehouseLockedError, setIsWarehouseLockedError] = useState(false);
 
 // FEFO Allocator State
 const [fefoOpen, setFefoOpen] = useState(false);
 const [activeLine, setActiveLine] = useState<LineItem | null>(null);
 const [lots, setLots] = useState<Lot[]>([]);

 const { register, handleSubmit, reset, control, formState: { errors } } = useForm<GRNHeaderFormValues>({
 resolver: zodResolver(grnHeaderSchema),
 defaultValues: {
 supplier_id: '',
 currency_id: 'SAR',
 warehouse_id: 'wh-1',
 notes: '',
 }
 });

 const currencyId = useWatch({
 control,
 name: 'currency_id',
 });
 const warehouseId = useWatch({
 control,
 name: 'warehouse_id',
 });

 const { data: lockState } = useWarehouseLock(warehouseId);
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
 id: `new- ${Date.now()}`,
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
 const isApproved = grn?.status === 'APPROVED';
 const isLocked = lockState?.is_locked ?? false;

 if (isLoadingGRN) return (
 <div className="flex flex-col h-[60vh] items-center justify-center bg-surface-container-low rounded-lg animate-pulse">
 <div className="relative">
 <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
 <div className="absolute inset-0 flex items-center justify-center text-label-xs font-semibold text-primary uppercase">GRN</div>
 </div>
 <p className="mt-6 text-label-xs font-semibold uppercase text-primary/60 animate-pulse">{t('initializing_context')}</p>
 </div>
 );

 const mockTimeline = grn ? [
 { status: grn.status.toLowerCase() as Status, at: new Date().toISOString(), by: user?.name || 'System User' }
 ] : [];

 return (
 <div className="min-h-screen bg-surface-container-low pb-20">
 {/* Ledger Header (Solid Structural) */}
 <div className="bg-surface-container-lowest shadow-sm px-6 lg:px-10 py-6 mb-10 flex items-center justify-between gap-6 relative z-30">
 <div className="flex items-center gap-6">
 <Button 
 variant="ghost" 
 size="icon" 
 onClick={() => router.back()} 
 className="rounded-lg shrink-0 hover:bg-surface-container-low transition-colors"
 >
 <ArrowLeft className={cn("w-5 h-5 text-primary", locale === 'ar' && "rotate-180")} />
 </Button>
 <div className="flex flex-col">
 <div className="flex items-center gap-3">
 <h1 className="text-headline-lg font-semibold uppercase italic text-foreground">
 {isNew ? t('create_new') : `#${grn?.document_number}`}
 </h1>
 {!isNew && <StatusBadge status={grn?.status as BadgeStatus} />}
 </div>
 <p className="text-label-xs font-semibold uppercase text-primary/40 mt-1">
 {isNew ? t('new_manifest_sub') : t('detail_sub')}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <PermissionGate action={isNew ? "create" : "edit"} resource="grn">
 {!isPosted && (
 <Button 
 variant="ghost" 
 disabled={isLocked}
 className="h-10 px-6 text-label-xs font-semibold uppercase rounded-lg transition-all"
 >
 <Save className="w-4 h-4 me-2 opacity-60" />
 {t('save_draft')}
 </Button>
 )}
 </PermissionGate>
 <PermissionGate action="post" resource="grn">
 {isApproved && (
 <Button 
 disabled={isLocked}
 onClick={() => router.push(`/ ${locale}/goods-received/ ${id}/post`)}
 className="h-10 px-8 primary-gradient text-white text-label-xs font-semibold uppercase shadow-xl shadow-primary/20 transition-all rounded-lg"
 >
 <Send className="w-4 h-4 me-2" />
 {t('post_grn')}
 </Button>
 )}
 </PermissionGate>
 </div>
 </div>

 <div className="max-w-[1400px] mx-auto px-6 lg:px-10 space-y-10">
 {(isLocked || isWarehouseLockedError) && <LockBanner lockState={lockState} />}
 
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {/* Supplier Selector */}
 <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm flex flex-col gap-1 transition-all hover:shadow-md group relative overflow-hidden">
 <Label htmlFor="supplier-select" className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('supplier')}</Label>
 {isPosted ? (
 <p className="font-bold text-title-sm mt-2 italic uppercase text-foreground">Supply Co</p>
 ) : (
 <>
 <Controller
 name="supplier_id"
 control={control}
 render={({ field }) => (
 <Select onValueChange={field.onChange} value={field.value} disabled={isPosted}>
 <SelectTrigger className="mt-2 h-12 bg-surface-container-low border-none rounded-lg px-4 font-semibold uppercase text-foreground shadow-none focus:ring-1 focus:ring-primary-fixed-dim/10 transition-all">
 <SelectValue placeholder={tc('select_supplier')} />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-highest border-none rounded-lg shadow-2xl">
 <SelectItem value="sup-1" className="text-label-sm font-bold focus:bg-primary/10 focus:text-primary">Supply Co</SelectItem>
 <SelectItem value="sup-2" className="text-label-sm font-bold focus:bg-primary/10 focus:text-primary">Other Co</SelectItem>
 </SelectContent>
 </Select>
 )}
 />
 {errors.supplier_id && <span className="text-label-xs text-destructive mt-1 font-bold">{errors.supplier_id.message}</span>}
 </>
 )}
 </div>

 {/* Currency Selector */}
 <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm flex flex-col gap-1 transition-all hover:shadow-md group relative overflow-hidden">
 <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
 <Wallet className="w-12 h-12" />
 </div>
 <Label htmlFor="currency-select" className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('order_currency')}</Label>
 {isPosted ? (
 <p className="font-mono font-semibold text-title-sm text-primary mt-2">{grn?.currency_id}</p>
 ) : (
 <>
 <Controller
 name="currency_id"
 control={control}
 render={({ field }) => (
 <Select onValueChange={field.onChange} value={field.value} disabled={isPosted}>
 <SelectTrigger className="mt-2 h-12 bg-surface-container-low border-none rounded-lg px-4 font-semibold font-mono text-foreground shadow-none focus:ring-1 focus:ring-primary-fixed-dim/10 transition-all">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-highest border-none rounded-lg shadow-2xl">
 <SelectItem value="SAR" className="text-label-sm font-bold focus:bg-primary/10 focus:text-primary font-mono">{tc('currencies.sar_full')}</SelectItem>
 <SelectItem value="USD" className="text-label-sm font-bold focus:bg-primary/10 focus:text-primary font-mono">{tc('currencies.usd_full')}</SelectItem>
 </SelectContent>
 </Select>
 )}
 />
 {errors.currency_id && <span className="text-label-xs text-destructive mt-1 font-bold">{errors.currency_id.message}</span>}
 </>
 )}
 </div>

 {/* Linked PO */}
 <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm flex flex-col gap-1 transition-all hover:shadow-md group relative overflow-hidden">
 <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
 <PackageSearch className="w-12 h-12" />
 </div>
 <p className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('ref_document')}</p>
 <div className="mt-2">
 {grn?.po_number ? (
 <Badge variant="outline" className="h-8 px-4 bg-primary/5 text-primary border-primary/20 text-label-xs font-semibold uppercase rounded-lg">
 <span dir="ltr" className="font-mono">{grn.po_number}</span>
 </Badge>
 ) : (
 <p className="font-semibold text-title-sm text-primary/10 italic uppercase">{t('direct_receipt')}</p>
 )}
 </div>
 </div>

 {/* Warehouse */}
 <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm flex flex-col gap-1 transition-all hover:shadow-md group relative overflow-hidden">
 <Label htmlFor="warehouse-select" className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('warehouse')}</Label>
 {isPosted ? (
 <p className="font-bold text-title-sm mt-2 uppercase italic text-foreground">Main Warehouse</p>
 ) : (
 <>
 <Controller
 name="warehouse_id"
 control={control}
 render={({ field }) => (
 <Select onValueChange={field.onChange} value={field.value} disabled={isPosted}>
 <SelectTrigger className="mt-2 h-12 bg-surface-container-low border-none rounded-lg px-4 font-semibold uppercase text-foreground shadow-none focus:ring-1 focus:ring-primary-fixed-dim/10 transition-all">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-highest border-none rounded-lg shadow-2xl">
 <SelectItem value="wh-1" className="text-label-sm font-bold focus:bg-primary/10 focus:text-primary">Main Warehouse</SelectItem>
 <SelectItem value="wh-2" className="text-label-sm font-bold focus:bg-primary/10 focus:text-primary">Kitchen Store</SelectItem>
 </SelectContent>
 </Select>
 )}
 />
 {errors.warehouse_id && <span className="text-label-xs text-destructive mt-1 font-bold">{errors.warehouse_id.message}</span>}
 </>
 )}
 </div>

 <div className="col-span-full bg-surface-container-lowest p-6 rounded-lg shadow-sm flex flex-col gap-1 transition-all hover:shadow-md group relative overflow-hidden">
 <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
 <MessageSquare className="w-12 h-12" />
 </div>
 <Label htmlFor="notes-area" className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('notes')}</Label>
 <Textarea 
 id="notes-area"
 {...register('notes')}
 disabled={isPosted} 
 className="mt-2 w-full bg-surface-container-low border-none rounded-lg p-4 focus-visible:ring-1 focus-visible:ring-primary-fixed-dim/10 outline-none transition-all text-body-md font-medium min-h-[100px] resize-none text-foreground shadow-none" 
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
 className="bg-surface-container-lowest rounded-lg transition-all focus-within:ring-1 focus-within:ring-primary-fixed-dim/10 shadow-sm"
 />
 {scanError && <div dir="ltr" className="text-destructive text-label-xs font-semibold uppercase ps-2">{scanError}</div>}
 
 <div className="bg-surface-container-lowest rounded-lg overflow-hidden shadow-sm">
 <DocumentLineItemTable<LineItem> 
 lines={lines} 
 locale={locale as 'ar' | 'en'} isReadOnly={isPosted}
 onRemoveLine={removeLine}
 extraColumns={[
 {
 header: tc('table_headers.received_qty'),
 cell: (line: LineItem) => isPosted ? (
 <span dir="ltr" className="font-mono font-bold text-foreground/80">{line.received_qty}</span>
 ) : (
 <input type="number" 
 dir="ltr"
 className="w-20 bg-surface-container-low rounded-lg text-center px-2 py-1.5 font-mono text-body-md focus:ring-1 focus:ring-primary-fixed-dim/10 outline-none transition-all"
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
 className="text-primary underline underline-offset-4 decoration-dotted decoration-primary/40 hover:decoration-primary text-label-xs font-semibold uppercase transition-all"
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
 </div>
 </DocumentReadOnlyOverlay>

 {/* Financial Summary */}
 <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-8 pt-10">
 <div className="flex flex-col items-end gap-1 px-6 border-e border-surface-container-high/20">
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/50">
 {isPosted ? t('finalized_rate') : t('market_index_ref')}
 </p>
 <div className={`flex items-center gap-2 ${isPosted ? 'text-amber-500' : 'text-primary'}`}>
 <TrendingUp className="w-3 h-3" />
 <p dir="ltr" className="text-label-sm font-mono font-semibold">
 1 {currencyId} = {isPosted ? (grn?.fx_rate || 1) : currentFxRate} {baseCurrency}
 </p>
 </div>
 </div>

 <div className="bg-surface-container-lowest p-8 rounded-lg shadow-xl relative overflow-hidden min-w-[340px] group transition-all hover:shadow-2xl">
 <div className="absolute top-0 end-0 w-1 h-full bg-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] group-hover:bg-primary transition-all" />
 
 <div className="space-y-6 relative z-10">
 <div className="flex justify-between items-baseline gap-10">
 <p className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{t('receipt_total', { currency: currencyId })}</p>
 <p dir="ltr" className="text-headline-lg font-display font-semibold text-foreground">{totalForeign.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
 </div>
 
 <div className="h-px bg-surface-container-high/20 w-full" />
 
 <div className="flex justify-between items-center gap-10">
 <p className="text-label-xs font-semibold uppercase text-primary/20">{t('base_value', { currency: baseCurrency })}</p>
 <p dir="ltr" className="text-title-lg font-mono font-semibold text-primary/60">
 {(totalForeign * (isPosted ? (grn?.fx_rate || 1) : currentFxRate)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
 </p>
 </div>
 </div>
 </div>
 </div>

 {mockTimeline.length > 0 && (
 <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm transition-all hover:bg-surface-container-low/50">
 <div className="flex items-center gap-3 mb-10">
 <History className="w-4 h-4 text-primary opacity-20" />
 <h3 className="text-label-xs font-semibold uppercase text-primary/30">{tc('audit_trail')}</h3>
 </div>
 <StatusTimeline entries={mockTimeline} />
 </div>
 )}
 </div>

 <Sheet open={fefoOpen} onOpenChange={setFefoOpen}>
 <SheetContent side="bottom" className="h-[80vh] bg-surface-container-lowest border-none shadow-2xl rounded-t-lg">
 <SheetHeader>
 <SheetTitle className="text-title-lg font-semibold uppercase italic">{t('fefo_allocation')}</SheetTitle>
 </SheetHeader>
 <div className="py-4">
 {activeLine && (
 <FEFOLotAllocator
 lots={lots}
 requestedQty={activeLine.received_qty}
 uomLabel={activeLine.item.primary_uom.code}
 userRole={user?.role || 'WH_KEEPER'} onAllocate={(allocations) => {
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
