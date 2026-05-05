'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { 
 Select, 
 SelectContent, 
 SelectItem, 
 SelectTrigger, 
 SelectValue 
} from '@/components/ui/select';
import { useWarehouses } from '@/features/warehouses/api/useWarehouses';
import { useItems } from '@/features/items/api/useItems';
import { useCreateTransfer } from '@/features/operations/hooks/useCreateTransfer';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { LockBanner } from '@/components/shared/LockBanner';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { cn } from '@/lib/utils';
import { ArrowLeft, Save, Warehouse, PackagePlus } from 'lucide-react';

export function TransferNewClient() {
 const params = useParams();
 const locale = (params.locale as 'ar' | 'en') || 'en';
 const t = useTranslations('operations.transfer');
 const tCommon = useTranslations('common');
 const router = useRouter();

 const { data: warehouses } = useWarehouses();
 const { data: items } = useItems();
 const createTransfer = useCreateTransfer();

 const [fromWarehouseId, setFromWarehouseId] = useState('');
 const [toWarehouseId, setToWarehouseId] = useState('');
 const [notes, setNotes] = useState('');
 const [lines, setLines] = useState<any[]>([]);

 // Warehouse locks
 const { data: fromLockState } = useWarehouseLock(fromWarehouseId);
 const { data: toLockState } = useWarehouseLock(toWarehouseId);
 const isEitherLocked = !!fromLockState?.isLocked || !!toLockState?.isLocked;

 const handleAddItem = (barcode: string) => {
 const item = items?.find(i => i.sku === barcode);
 if (!item) return;

 setLines(prev => {
 const existing = prev.find(l => l.item_id === item.id);
 if (existing) {
 return prev.map(l => l.item_id === item.id ? { ...l, qty: l.qty + 1 } : l);
 }
 return [...prev, {
 id: Math.random().toString(36).substring(2, 9),
 item_id: item.id,
 item: {
 id: item.id,
 code: item.sku,
 name_ar: item.nameAr,
 name_en: item.nameEn,
 primary_uom: { code: item.uom }
 },
 qty: 1,
 uom_id: item.uom
 }];
 });
 };

 const handleSave = async () => {
 if (!fromWarehouseId || !toWarehouseId || lines.length === 0) return;
 
 try {
 await createTransfer.mutateAsync({
 from_warehouse_id: fromWarehouseId,
 to_warehouse_id: toWarehouseId,
 notes,
 lines: lines.map(l => ({
 item_id: l.item_id,
 qty: l.qty,
 uom_id: l.uom_id
 }))
 });
 router.push(`/transfers`);
 } catch (e) {
 console.error(e);
 }
 };

 const isValid = fromWarehouseId && toWarehouseId && fromWarehouseId !== toWarehouseId && lines.length > 0;

 return (
 <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
 <Breadcrumb 
 items={[
 { label: tCommon('modules.operations'), href: `/transfers` },
 { label: t('title'), href: `/transfers` },
 { label: t('create_new') }
 ]} 
 />

 <PageHeader
 title={t('create_new')}
 description={t('description')}
 actions={
 <div className="flex gap-4 items-center">
 <Button 
 variant="ghost" 
 onClick={() => router.back()}
 className="text-label-xs font-semibold uppercase text-muted-foreground/60 hover:text-foreground h-11 px-6 rounded-xl"
 >
 <ArrowLeft className={cn("w-4 h-4 me-2", locale === 'ar' && "rotate-180")} />
 {tCommon('back')}
 </Button>
 <Button 
 onClick={handleSave} 
 disabled={!isValid || createTransfer.isPending || isEitherLocked}
 className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl h-11 px-8 text-label-xs font-semibold uppercase transition-all shadow-lg shadow-cyan-900/20 disabled:opacity-30"
 >
 <Save className="w-4 h-4 me-2" />
 {t('save_draft')}
 </Button>
 </div>
 }
 />

 <div className="space-y-2">
 {fromLockState?.isLocked && <LockBanner lockState={fromLockState} />}
 {toLockState?.isLocked && toLockState.sessionId !== fromLockState?.sessionId && (
 <LockBanner lockState={toLockState} />
 )}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <div className="lg:col-span-1 space-y-8">
 <div className="bg-surface-container-low/50 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-2xl">
 <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-e from-cyan-500/50 via-cyan-500/20 to-transparent" />
 
 <div className="flex items-center gap-3 mb-6">
 <Warehouse className="w-4 h-4 text-cyan-500" />
 <h3 className="text-label-xs font-semibold uppercase text-foreground/60">
 {t('transfer_parameters')}
 </h3>
 </div>

 <div className="space-y-6">
 <div className="space-y-2">
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1">
 {t('from_warehouse')}
 </label>
 <Select
 value={fromWarehouseId}
 onValueChange={(val) => setFromWarehouseId(val || '')}
 >
 <SelectTrigger className="w-full bg-surface-container-highest/40 border-none h-14 px-6 text-label-xs font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20 transition-all">
 <SelectValue placeholder={t('select_warehouse')} />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-highest border border-surface-container-high/50 shadow-2xl rounded-2xl overflow-hidden">
 {warehouses?.map((wh) => (
 <SelectItem key={wh.id} value={wh.id} className="text-label-xs font-bold py-3 focus:bg-cyan-500/10 focus:text-cyan-400">
 {locale === 'ar' ? wh.nameAr : wh.nameEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1">
 {t('to_warehouse')}
 </label>
 <Select
 value={toWarehouseId}
 onValueChange={(val) => setToWarehouseId(val || '')}
 >
 <SelectTrigger className="w-full bg-surface-container-highest/40 border-none h-14 px-6 text-label-xs font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20 transition-all">
 <SelectValue placeholder={t('select_warehouse')} />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-highest border border-surface-container-high/50 shadow-2xl rounded-2xl overflow-hidden">
 {warehouses?.map((wh) => (
 <SelectItem key={wh.id} value={wh.id} className="text-label-xs font-bold py-3 focus:bg-cyan-500/10 focus:text-cyan-400">
 {locale === 'ar' ? wh.nameAr : wh.nameEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 {fromWarehouseId && toWarehouseId && fromWarehouseId === toWarehouseId && (
 <p className="text-label-xxs font-bold text-status-error uppercase px-1 mt-1">
 {t('warehouse_match_error')}
 </p>
 )}
 </div>

 <div className="space-y-2">
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1">
 {tCommon('notes')}
 </label>
 <textarea
 value={notes}
 onChange={e => setNotes(e.target.value)}
 placeholder={t('notes_placeholder')}
 className="w-full bg-surface-container-highest/40 border border-white/5 rounded-2xl p-4 font-medium text-body-md focus:ring-2 focus:ring-cyan-500/30 transition-all outline-none resize-none min-h-[120px] hover:bg-surface-container-highest/60"
 />
 </div>
 </div>
 </div>
 </div>

 <div className="lg:col-span-2 space-y-6">
 <div className="bg-surface-container-low/50 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-2xl">
 <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-e from-emerald-500/50 via-emerald-500/20 to-transparent" />
 
 <div className="flex items-center justify-between mb-8">
 <div className="flex items-center gap-3">
 <PackagePlus className="w-5 h-5 text-emerald-500" />
 <h3 className="text-label-xs font-semibold uppercase text-foreground/60">
 {t('items_to_transfer')}
 </h3>
 </div>
 <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
 <span className="text-label-xxs font-semibold uppercase text-emerald-500">
 {lines.length} {tCommon('items')}
 </span>
 </div>
 </div>

 <div className="mb-8">
 <ScanInput 
 onScan={handleAddItem}
 placeholder={t('scan_item_placeholder')} className="max-w-md mx-auto"
 />
 </div>

 <div className="bg-surface-container-low/30 rounded-[2rem] border border-white/5 overflow-hidden">
 <DocumentLineItemTable
 lines={lines}
 locale={locale}
 isReadOnly={false}
 onRemoveLine={(id) => setLines(prev => prev.filter(l => l.id !== id))}
 hideLotColumns={true}
 headers={{
 code: tCommon('table_headers.code'),
 name: tCommon('table_headers.name'),
 qty: ' ',
 uom: tCommon('table_headers.uom'),
 }}
 extraColumns={[
 {
 header: tCommon('table_headers.qty'),
 cell: (line) => (
 <div className="flex justify-center">
 <input
 type="number"
 min="0.001"
 step="0.001"
 value={line.qty}
 onChange={(e) => {
 const val = parseFloat(e.target.value);
 setLines(prev => prev.map(l => l.id === line.id ? { ...l, qty: val || 0 } : l));
 }}
 className="w-20 bg-surface-container-highest/60 border border-white/5 rounded-lg text-center py-1.5 font-mono text-body-md font-semibold focus:ring-2 focus:ring-cyan-500/30 outline-none"
 />
 </div>
 )
 }
 ]}
 />
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
