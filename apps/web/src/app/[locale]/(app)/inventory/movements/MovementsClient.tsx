'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from '@/i18n/navigation';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { useInventoryMovements } from '@/features/inventory/hooks/useInventoryMovements';
import { generateExcel } from '@/utils/export';
import { InventoryMovement } from '@/types/inventory';

import { formatQuantity } from '@/lib/utils';
import { formatNumber, formatDate } from '@/utils/currency';
import { Activity, ArrowUpRight, ArrowDownRight, Search, Download, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const getTypeStyle = (docType: string) => {
 switch (docType) {
 case 'GRN': return 'bg-status-success/10 text-status-success';
 case 'ISSUE': return 'bg-status-warning/10 text-status-warning';
 case 'TRANSFER': return 'bg-operational-cyan/10 text-operational-cyan';
 case 'ADJUSTMENT': return 'bg-indigo-500/10 text-indigo-400';
 default: return 'bg-muted/10 text-muted-foreground';
 }
};

export default function MovementsClient() {
 const t = useTranslations('inventory.movements');
 const tc = useTranslations('common');
 const currentLocale = useLocale();
 const isRtl = currentLocale === 'ar';

 const [searchFilter, setSearchFilter] = useState('');
 const [typeFilter, setTypeFilter] = useState('');
 const [page, setPage] = useState(1);

 const { data, isLoading } = useInventoryMovements({ 
 search: searchFilter || undefined,
 document_type: typeFilter || undefined,
 page 
 });

 const getDocumentPath = useMemo(() => (movement: InventoryMovement): string => {
 switch (movement.document_type) {
 case 'GRN': return `/procurement/grn/${movement.document_id}`;
 case 'ISSUE': return `/operations/issues/${movement.document_id}`;
 case 'TRANSFER': return `/operations/transfers/${movement.document_id}`;
 case 'ADJUSTMENT': return `/operations/adjustments/${movement.document_id}`;
 default: return '#';
 }
 }, []);

 const columns = useMemo<ColumnDef<InventoryMovement, unknown>[]>(() => [
 {
 accessorKey: 'posted_at',
 header: t('posted_at'),
 cell: ({ row }) => (
 <div className="flex flex-col gap-0.5">
 <span dir="ltr" className="text-label-xs font-mono font-semibold text-foreground/60">
 {formatDate(row.original.posted_at, currentLocale as 'ar' | 'en')}
 </span>
 <span className="text-label-xxs font-semibold text-muted-foreground/40 uppercase">{t('temporal_mark')}</span>
 </div>
 ),
 },
 {
 accessorKey: 'document_number',
 header: t('document_number'),
 cell: ({ row }) => (
 <div className="flex flex-col gap-0.5">
 <Link
 href={getDocumentPath(row.original)}
 className="text-label-xs font-semibold text-operational-cyan hover:text-operational-cyan/80 transition-colors drop-shadow-[0_0_8px_rgba(var(--operational-cyan-rgb),0.3)]"
 >
 <span dir="ltr">{row.original.document_number}</span>
 </Link>
 <span className="text-label-xxs font-semibold text-muted-foreground/40 uppercase">{t('source_reference')}</span>
 </div>
 ),
 },
 {
 accessorKey: 'document_type',
 header: t('document_type'),
 cell: ({ row }) => (
 <Badge variant="secondary" className={`${getTypeStyle(row.original.document_type)} text-label-xxs font-semibold uppercase px-3 h-6 rounded-xl`}>
 {t(`types.${row.original.document_type.toLowerCase()}` as 'types.grn' | 'types.issue' | 'types.transfer' | 'types.adjustment')}
 </Badge>
 ),
 },
 {
 accessorKey: 'item_code',
 header: t('item_code'),
 cell: ({ row }) => (
 <div className="flex flex-col gap-0.5">
 <span dir="ltr" className="font-mono text-label-xs font-semibold text-foreground uppercase">
 {row.original.item_code}
 </span>
 <span className="text-label-xxs font-semibold text-muted-foreground/40 uppercase">{t('system_id')}</span>
 </div>
 ),
 },
 {
 id: 'item_name',
 header: t('item_name'),
 cell: ({ row }) => (
 <div className="flex flex-col gap-0.5 max-w-[220px]">
 <span className="font-semibold text-label-sm text-foreground truncate group-hover:text-cyan-400 transition-colors leading-tight">
 {currentLocale === 'ar' ? row.original.item_name_ar : row.original.item_name_en}
 </span>
 <span className="text-label-xxs font-bold text-muted-foreground/60 truncate uppercase">
 {t('sku_master_entity')}
 </span>
 </div>
 ),
 },
 {
 accessorKey: 'direction',
 header: t('direction'),
 cell: ({ row }) => {
 const isEntry = row.original.direction === 'IN';
 return (
 <div className={`flex items-center gap-2 font-semibold text-label-xs uppercase ${isEntry ? 'text-status-success' : 'text-status-error'}`}>
 <div className={`p-1.5 rounded-lg ${isEntry ? 'bg-status-success/10' : 'bg-status-error/10'}`}>
 {isEntry ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
 </div>
 {isEntry ? t('in') : t('out')}
 </div>
 );
 },
 },
 {
 accessorKey: 'qty',
 header: t('qty'),
 cell: ({ row }) => (
 <div className="flex flex-col items-end">
 <span dir="ltr" className={`font-mono text-label-sm font-semibold px-3 py-1 rounded-xl ${ row.original.direction === 'IN' ? 'text-status-success bg-status-success/10 border border-status-success/20' : 'text-status-error bg-status-error/10 border border-status-error/20' }`}>
 {formatQuantity(row.original.qty, currentLocale as 'ar' | 'en')}
 </span>
 <span className="text-label-xxs font-semibold text-muted-foreground/40 uppercase mt-1">{t('movement_delta')}</span>
 </div>
 ),
 },
 ], [t, currentLocale, getDocumentPath]);

 const handleExport = () => {
 if (!data?.data) return;
 const columns = [
 { header: t('posted_at'), key: 'posted_at', width: 20 },
 { header: t('document_number'), key: 'document_number', width: 20 },
 { header: t('document_type'), key: 'document_type', width: 15 },
 { header: t('item_code'), key: 'item_code', width: 15 },
 { header: t('item_name'), key: 'item_name', width: 30 },
 { header: t('lot'), key: 'lot_number', width: 15 },
 { header: t('direction'), key: 'direction', width: 10 },
 { header: t('qty'), key: 'qty', width: 10 },
 ];

 const rows = data.data.map(item => ({
 ...item,
 posted_at: formatDate(item.posted_at, currentLocale as 'ar' | 'en'),
 item_name: currentLocale === 'ar' ? item.item_name_ar : item.item_name_en,
 }));

 generateExcel(columns, rows, 'Stock_Movements');
 };

 const stats = useMemo(() => ({
 total: data?.meta?.total || 0,
 inbound: data?.data?.filter(m => m.direction === 'IN').length || 0,
 outbound: data?.data?.filter(m => m.direction === 'OUT').length || 0,
 }), [data]);

 return (
 <div className="space-y-12 animate-in fade-in duration-1000">
 {/* KPI Section */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 <div className="relative group overflow-hidden bg-surface-container-lowest p-8 rounded-2xl shadow-2xl transition-all hover:bg-surface-container-high border border-border-muted/50">
 <div className="absolute top-0 end-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
 <Activity className="w-20 h-20 text-operational-cyan" />
 </div>
 <div className="relative z-10 space-y-4">
 <span className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('ledger_pulse')}</span>
 <div className="flex items-baseline gap-3">
 <h2 className="text-headline-lg font-semibold text-foreground font-mono">
 {formatNumber(stats.total, currentLocale as 'ar' | 'en')}
 </h2>
 <span className="text-label-xs font-semibold text-operational-cyan/30 uppercase">{t('events')}</span>
 </div>
 </div>
 <div className="absolute bottom-0 start-0 h-1 w-full bg-surface-container-highest/50">
 <div className="h-full bg-operational-cyan/20 w-full transition-all duration-1000" />
 </div>
 </div>

 <div className="relative group overflow-hidden bg-surface-container-lowest p-8 rounded-2xl shadow-2xl transition-all hover:bg-surface-container-high border border-border-muted/50">
 <div className="absolute top-0 end-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
 <ArrowUpRight className="w-20 h-20 text-status-success" />
 </div>
 <div className="relative z-10 space-y-4">
 <span className="text-label-xs font-semibold uppercase text-status-success/40">{t('inbound_stream')}</span>
 <div className="flex items-baseline gap-3">
 <h2 className="text-headline-lg font-semibold text-status-success drop-shadow-[0_0_15px_rgba(var(--status-success-rgb),0.3)] font-mono">
 {formatNumber(stats.inbound, currentLocale as 'ar' | 'en')}
 </h2>
 <span className="text-label-xs font-semibold text-status-success/30 uppercase">{t('nodes')}</span>
 </div>
 </div>
 <div className="absolute bottom-0 start-0 h-1 w-full bg-surface-container-highest/50">
 <div 
 className="h-full bg-status-success shadow-[0_0_10px_rgba(var(--status-success-rgb),0.5)] transition-all duration-1000" 
 style={{ width: `${(stats.inbound / (stats.total || 1)) * 100}%` }}
 />
 </div>
 </div>

 <div className="relative group overflow-hidden bg-surface-container-lowest p-8 rounded-2xl shadow-2xl transition-all hover:bg-surface-container-high border border-border-muted/50">
 <div className="absolute top-0 end-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
 <ArrowDownRight className="w-20 h-20 text-status-error" />
 </div>
 <div className="relative z-10 space-y-4">
 <span className="text-label-xs font-semibold uppercase text-status-error/40">{t('outbound_flow')}</span>
 <div className="flex items-baseline gap-3">
 <h2 className="text-headline-lg font-semibold text-status-error drop-shadow-[0_0_15px_rgba(var(--status-error-rgb),0.3)] font-mono">
 {formatNumber(stats.outbound, currentLocale as 'ar' | 'en')}
 </h2>
 <span className="text-label-xs font-semibold text-status-error/30 uppercase">{t('dissipation')}</span>
 </div>
 </div>
 <div className="absolute bottom-0 start-0 h-1 w-full bg-surface-container-highest/50">
 <div 
 className="h-full bg-status-error shadow-[0_0_10px_rgba(var(--status-error-rgb),0.5)] transition-all duration-1000" 
 style={{ width: `${(stats.outbound / (stats.total || 1)) * 100}%` }}
 />
 </div>
 </div>
 </div>

 {/* Advanced Action Bar */}
 <div className="flex flex-wrap items-center justify-between gap-8 bg-surface-container-low p-8 rounded-2xl shadow-xl border border-border-muted/50">
 <div className="flex flex-wrap items-center gap-8 flex-1">
 <div className="flex flex-col gap-2 flex-1 min-w-[300px]">
 <span className="text-label-xxs font-semibold text-muted-foreground/60 uppercase ps-1">
 {t('ledger_query')}
 </span>
 <div className="relative group">
 <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-cyan-500 transition-colors" />
 <input
 type="search"
 placeholder={t('search_placeholder')}
 value={searchFilter}
 onChange={(e) => { setSearchFilter(e.target.value); setPage(1); }}
 className="w-full h-12 ps-12 pe-4 bg-surface-container-highest/30 border-none focus:ring-2 focus:ring-operational-cyan/30 rounded-xl text-label-sm font-bold transition-all"
 dir={isRtl ? 'rtl' : 'ltr'} />
 </div>
 </div>

 <div className="flex flex-col gap-2 min-w-[200px]">
 <span className="text-label-xxs font-semibold text-muted-foreground/60 uppercase ps-1">
 {t('document_class')}
 </span>
 <Select
 value={typeFilter}
 onValueChange={(val) => { if (val) { setTypeFilter(val === 'ALL' ? '' : val); setPage(1); } }}
 >
 <SelectTrigger className="h-12 bg-surface-container-highest/30 border-none rounded-xl text-label-xs font-semibold uppercase focus:ring-operational-cyan/30 transition-all px-6">
 <SelectValue placeholder={tc('statuses.all')} />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-low border border-border-muted/50 shadow-2xl rounded-2xl">
 <SelectItem value="ALL" className="text-label-xs font-semibold uppercase">{tc('statuses.all')}</SelectItem>
 <SelectItem value="GRN" className="text-label-xs font-semibold uppercase text-status-success">{t('types.grn')}</SelectItem>
 <SelectItem value="ISSUE" className="text-label-xs font-semibold uppercase text-status-warning">{t('types.issue')}</SelectItem>
 <SelectItem value="TRANSFER" className="text-label-xs font-semibold uppercase text-operational-cyan">{t('types.transfer')}</SelectItem>
 <SelectItem value="ADJUSTMENT" className="text-label-xs font-semibold uppercase text-indigo-400">{t('types.adjustment')}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <Button 
 variant="secondary" 
 onClick={handleExport}
 className="h-12 px-8 bg-surface-container-high/50 hover:bg-surface-container-high text-foreground text-label-xs font-semibold uppercase rounded-xl transition-all border-none shadow-md group"
 >
 <Download className="w-3.5 h-3.5 me-3 text-operational-cyan transition-transform group-hover:-translate-y-0.5" />
 {t('export_manifest')}
 </Button>
 </div>

 <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-border-muted/50 overflow-hidden">
 <DataTable 
 columns={columns} 
 data={data?.data ?? []} 
 isLoading={isLoading}
 collectionName="inventory_operational_ledger"
 pagination={data?.meta ? {
 page: data.meta.page,
 pageSize: data.meta.page_size,
 total: data.meta.total,
 totalPages: data.meta.total_pages,
 onPageChange: setPage
 } : undefined}
 emptyState={
 <div className="flex flex-col items-center justify-center py-32 gap-6 opacity-20">
 <History className="w-16 h-16 text-muted-foreground/60" />
 <div className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('zero_movement')}</div>
 </div>
 }
 />
 </div>
 </div>
 );
}
