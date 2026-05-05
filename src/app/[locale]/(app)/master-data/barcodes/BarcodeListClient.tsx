'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Tag, CheckCircle2, Package, Search, Barcode as BarcodeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useBarcodes } from '@/features/barcodes/hooks/useBarcodes';
import { useItems } from '@/features/items/hooks/useItems';
import { useUoMs } from '@/features/uoms/hooks/useUoMs';
import { type Barcode } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';

export function BarcodeListClient({ locale }: { locale: string }) {
 const tc = useTranslations('common');
 const t = useTranslations('master_data.barcodes');
 const router = useRouter();
 const [search, setSearch] = useState('');

 const { data: queryData, isLoading: isLoadingBarcodes } = useBarcodes({ search });
 const { data: itemsData } = useItems();
 const { data: uomsData } = useUoMs();

 const barcodes = queryData?.data || [];
 const items = itemsData?.data || [];
 const uoms = uomsData?.data || [];

 const stats = useMemo(() => {
 return {
 total: barcodes.length,
 active: barcodes.filter(b => b.is_active).length,
 items: new Set(barcodes.map(b => b.item_id)).size
 };
 }, [barcodes]);

 const columns = useMemo<ColumnDef<Barcode, unknown>[]>(() => [
 { 
 accessorKey: 'code', 
 header: t('fields.code'), 
 cell: ({ row }) => (
 <div className="flex items-center gap-2">
 <BarcodeIcon className="w-3.5 h-3.5 text-cyan-500/50" />
 <span dir="ltr" className="font-mono text-cyan-500/90 font-bold uppercase bg-cyan-500/5 px-2 py-0.5 rounded-sm">
 {row.original.code}
 </span>
 </div>
 )
 },
 { 
 accessorKey: 'item_id', 
 header: t('fields.item'), 
 cell: ({ row }) => {
 const item = items.find(i => i.id === row.original.item_id);
 if (!item) return <span className="opacity-40 italic">---</span>;
 return (
 <div className="flex flex-col gap-0.5">
 <span className="font-bold text-label-sm">{item.name_en}</span>
 <span className="text-label-xs opacity-40" dir="rtl">{item.name_ar}</span>
 </div>
 );
 }
 },
 { 
 accessorKey: 'uom_id', 
 header: t('fields.uom'), 
 cell: ({ row }) => {
 const uom = uoms.find(u => u.id === row.original.uom_id);
 if (!uom) return <span className="opacity-40 italic">---</span>;
 return (
 <div className="flex flex-col gap-0.5">
 <span className="font-bold text-label-sm">{uom.name_en}</span>
 <span className="text-label-xs opacity-40" dir="rtl">{uom.name_ar}</span>
 </div>
 );
 }
 },
 {
 accessorKey: 'default_qty',
 header: t('fields.default_qty'),
 cell: ({ row }) => {
 const uom = uoms.find(u => u.id === row.original.uom_id);
 return (
 <div className="flex items-center gap-1.5 font-mono">
 <span className="text-label-xs text-muted-foreground/40 font-bold italic">x</span>
 <span className="font-semibold text-amber-500/80">{row.original.default_qty}</span>
 {uom && (
 <span className="text-label-xs font-bold text-muted-foreground/30 uppercase">
 {uom.code}
 </span>
 )}
 </div>
 );
 }
 },
 {
 accessorKey: 'is_active', 
 header: t('fields.is_active'),
 cell: ({ row }) => (
 <StatusBadge 
 status={row.original.is_active ? 'ACTIVE' : 'INACTIVE'} className="rounded-sm h-5"
 />
 )
 },
 {
 id: 'actions',
 header: '',
 cell: ({ row }) => (
 <div className="flex justify-end">
 <PermissionGate action="view" resource="master_data">
 <Button 
 variant="ghost" 
 size="sm" 
 className="text-label-xs font-semibold uppercase text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 h-7"
 onClick={(e) => {
 e.stopPropagation();
 router.push(`/${locale}/master-data/barcodes/${row.original.id}`);
 }}
 >
 {tc('view')}
 </Button>
 </PermissionGate>
 </div>
 ),
 },
 ], [tc, t, locale, router, items, uoms]);

 return (
 <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
 <div className="space-y-4">
 <Breadcrumb 
 items={[
 { label: tc('home'), href: `/${locale}/dashboard` },
 { label: tc('master_data'), href: `/${locale}/master-data` },
 { label: t('title') }
 ]} 
 />
 <PageHeader 
 title={t('title')} 
 description={t('description')}
 actions={
 <PermissionGate action="create" resource="master_data">
 <Link href={`/${locale}/master-data/barcodes/new`}>
 <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-label-xs font-semibold uppercase rounded-sm transition-all shadow-lg shadow-cyan-900/20">
 <Plus className="w-3.5 h-3.5 me-2" />
 {tc('create')}
 </Button>
 </Link>
 </PermissionGate>
 }
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <MetricCard
 label={tc('total_records')}
 value={stats.total}
 icon={BarcodeIcon}
 color="cyan"
 dir="ltr"
 />

 <MetricCard
 label={tc('status.active')}
 value={stats.active}
 icon={CheckCircle2}
 color="emerald"
 dir="ltr"
 />

 <MetricCard
 label={t('fields.item')}
 value={stats.items}
 icon={Package}
 color="amber"
 dir="ltr"
 />
 </div>

 <DataTable 
 columns={columns} 
 data={barcodes} 
 isLoading={isLoadingBarcodes}
 collectionName="master_data_barcodes"
 onRowClick={(r: Barcode) => router.push(`/${locale}/master-data/barcodes/${r.id}`)}
 filters={
 <div className="flex flex-wrap items-end gap-6 w-full py-6 px-8 bg-surface-container-medium/30 rounded-sm">
 <div className="flex flex-col gap-2 min-w-[300px] flex-1">
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ps-1">{tc('search')}</label>
 <div className="relative">
 <Input
 placeholder={tc('search')}
 value={search}
 onChange={(e) => { setSearch(e.target.value); }}
 className="w-full bg-surface-container-highest/30 border-none h-12 px-12 text-label-sm font-bold rounded-sm shadow-inner shadow-black/20 focus-visible:ring-1 focus-visible:ring-cyan-500/30"
 />
 <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
 </div>
 </div>
 </div>
 }
 />

 {/* Quick Tips */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60 hover:opacity-100 transition-opacity duration-500 pb-10 pt-4 border-t border-surface-variant/5">
 <div className="p-6 bg-surface-container-low/50 rounded-sm border border-white/5 flex items-start gap-4">
 <div className="w-10 h-10 rounded-sm bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
 <BarcodeIcon className="w-5 h-5 text-cyan-500" />
 </div>
 <div className="space-y-1">
 <h4 className="text-label-xs font-semibold uppercase text-cyan-500">{t('tips.multi_unit_title')}</h4>
 <p className="text-label-xs text-muted-foreground font-semibold leading-relaxed uppercase">
 {t('tips.multi_unit_desc')}
 </p>
 </div>
 </div>
 <div className="p-6 bg-surface-container-low/50 rounded-sm border border-white/5 flex items-start gap-4">
 <div className="w-10 h-10 rounded-sm bg-amber-500/10 flex items-center justify-center flex-shrink-0">
 <Package className="w-5 h-5 text-amber-500" />
 </div>
 <div className="space-y-1">
 <h4 className="text-label-xs font-semibold uppercase text-amber-500">{t('tips.gtin_standard_title')}</h4>
 <p className="text-label-xs text-muted-foreground font-semibold leading-relaxed uppercase">
 {t('tips.gtin_standard_desc')}
 </p>
 </div>
 </div>
 </div>
 </div>
 );
}
