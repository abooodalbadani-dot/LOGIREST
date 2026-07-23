'use client';

import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useTranslations, useLocale } from 'next-intl';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from '@/i18n/navigation';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { VirtualizedMobileGrid } from '@/components/shared/VirtualizedMobileGrid';
import { useInventoryMovements } from '@/features/inventory/hooks/useInventoryMovements';
import { generateExcel } from '@/utils/export';
import { InventoryMovement, InventoryMovementSchema } from '@/types/inventory';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';

import { formatQuantity } from '@/lib/utils';
import { formatNumber, formatDate } from '@/utils/currency';
import { Activity, ArrowUpRight, ArrowDownRight, Search, Download, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { ExportMenu } from '@/components/shared/ExportMenu';

const getTypeStyle = (docType: string) => {
 const normalized = docType.toUpperCase();
 switch (normalized) {
  case 'RECEIPT':
  case 'GOODS_RECEIVED_NOTE':
   return 'bg-status-success/10 text-status-success border-status-success/20';
  case 'ISSUE':
  case 'INVENTORY_ISSUE':
   return 'bg-status-error/10 text-status-error border-status-error/20';
  case 'TRANSFER':
   return 'bg-status-info/10 text-status-info border-status-info/20';
  case 'ADJUSTMENT':
   return 'bg-status-warning/10 text-status-warning border-status-warning/20';
  default:
   return 'bg-muted/50 text-foreground border-border';
 }
};

export default function MovementsClient() {
 const t = useTranslations('inventory.movements');
 const tc = useTranslations('common');
 const currentLocale = useLocale();
 const isRtl = currentLocale === 'ar';

 const [page, setPage] = useState(1);
 const [typeFilter, setTypeFilter] = useState<string>('ALL');
 const [searchFilter, setSearchFilter] = useState<string>('');
 const debouncedSearch = useDebounce(searchFilter, 300);

 const { data, isLoading, isError, error } = useInventoryMovements({
  page,
  documentType: typeFilter !== 'ALL' ? typeFilter : undefined,
  search: debouncedSearch || undefined,
 });

 const getDocumentPath = useMemo(() => {
  return (type: string, id: string | null) => {
   if (!id) return '#';
   const norm = type.toUpperCase();
   switch (norm) {
    case 'RECEIPT':
    case 'GOODS_RECEIVED_NOTE':
     return `/goods-received/${id}`;
    case 'ISSUE':
    case 'INVENTORY_ISSUE':
     return `/issues/${id}`;
    case 'TRANSFER':
     return `/transfers/${id}`;
    case 'ADJUSTMENT':
     return `/adjustments/${id}`;
    default:
     return '#';
   }
  };
 }, []);

 const columns = useMemo<ColumnDef<InventoryMovement>[]>(() => [
  {
   accessorKey: 'timestamp',
   header: t('posted_at'),
   cell: ({ row }) => (
    <span dir="ltr" className="text-body-sm font-semibold text-foreground/90 font-mono tracking-tight block text-right rtl:text-right ltr:text-left">
     {formatDate(row.original.timestamp, currentLocale as 'ar' | 'en')}
    </span>
   ),
  },
  {
   accessorKey: 'transactionType',
   header: t('document_type'),
   cell: ({ row }) => (
    <Badge variant="secondary" className={`${getTypeStyle(row.original.transactionType)} text-label-xxs font-semibold uppercase px-3 h-6 rounded-xl`}>
     {t(`types.${row.original.transactionType.toLowerCase()}` as 'types.grn' | 'types.issue' | 'types.transfer' | 'types.adjustment')}
    </Badge>
   ),
  },
  {
   accessorKey: 'itemCode',
   header: t('item_code'),
   cell: ({ row }) => (
    <span dir="ltr" className="font-mono text-label-xs font-semibold text-foreground uppercase block">
     {row.original.itemCode || '—'}
    </span>
   ),
  },
  {
   id: 'itemName',
   header: t('item_name'),
   cell: ({ row }) => (
    <span className="font-semibold text-label-sm text-foreground truncate group-hover:text-foreground transition-colors leading-tight block max-w-[220px]">
     {row.original.itemName}
    </span>
   ),
  },
  {
   id: 'direction',
   header: t('direction'),
   cell: ({ row }) => {
    const isEntry = row.original.quantity > 0;
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
   accessorKey: 'quantity',
   header: t('qty'),
   meta: { numeric: true },
   cell: ({ row }) => {
    const isEntry = row.original.quantity > 0;
    return (
     <span dir="ltr" className={`inline-block font-mono text-label-sm font-semibold px-3 py-1 rounded-xl tabular-nums ${isEntry ? 'text-status-success bg-status-success/10 border border-status-success/20' : 'text-status-error bg-status-error/10 border border-status-error/20'}`}>
      {formatQuantity(Math.abs(row.original.quantity), currentLocale as 'ar' | 'en')}
     </span>
    );
   },
  },
 ], [t, currentLocale, getDocumentPath]);

 const handleExportAll = async (): Promise<Record<string, unknown>[]> => {
  try {
   const params = new URLSearchParams();
   params.set('page', '1');
   params.set('limit', '10000');
   if (searchFilter) params.set('search', searchFilter);
   if (typeFilter && typeFilter !== 'ALL') params.set('documentType', typeFilter);

   const res = await apiClient.get(`/inventory/movements?${params.toString()}`, paginatedSchema(InventoryMovementSchema));
   const allMovements = res?.data ?? data?.data ?? [];

   return allMovements.map((item) => ({
    ...item,
    createdAt: formatDate(item.timestamp, currentLocale as 'ar' | 'en'),
   }));
  } catch (err) {
   console.error('Failed to fetch all movements for export:', err);
   return (data?.data ?? []).map((item) => ({
    ...item,
    createdAt: formatDate(item.timestamp, currentLocale as 'ar' | 'en'),
   }));
  }
 };

 const handleExport = () => {
  if (!data?.data) return;
  const exportCols = [
   { header: t('posted_at'), key: 'timestamp', width: 20 },
   { header: t('document_number'), key: 'documentReference', width: 20 },
   { header: t('document_type'), key: 'transactionType', width: 15 },
   { header: t('item_code'), key: 'itemId', width: 15 },
   { header: t('item_name'), key: 'itemName', width: 30 },
   { header: t('qty'), key: 'quantity', width: 10 },
  ];

  const rows = data.data.map(item => ({
   ...item,
   timestamp: formatDate(item.timestamp, currentLocale as 'ar' | 'en'),
  }));

  generateExcel(exportCols, rows, 'Stock_Movements');
 };

 const stats = useMemo(() => ({
  total: data?.meta?.total ?? 0,
  inbound: data?.meta?.inboundCount ?? 0,
  outbound: data?.meta?.outboundCount ?? 0,
 }), [data]);

 return (
  <div className="space-y-12 animate-in fade-in duration-1000">
   {/* KPI Section */}
   <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-8">
    <div className="relative group overflow-hidden bg-card border border-border shadow-sm p-8 rounded-2xl shadow-2xl transition-all hover:bg-surface-container-high border border-border-muted/50">
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

    <div className="relative group overflow-hidden bg-card border border-border shadow-sm p-8 rounded-2xl shadow-2xl transition-all hover:bg-surface-container-high border border-border-muted/50">
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

    <div className="relative group overflow-hidden bg-card border border-border shadow-sm p-8 rounded-2xl shadow-2xl transition-all hover:bg-surface-container-high border border-border-muted/50">
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
   <div className="flex flex-wrap items-center justify-between gap-8 bg-card border border-border shadow-sm p-8 rounded-2xl shadow-xl border border-border-muted/50">
    <div className="flex flex-wrap items-center gap-8 flex-1">
     <div className="flex flex-col gap-2 flex-1 min-w-[300px] min-w-0">
      <span className="text-label-xxs font-semibold text-muted-foreground/60 uppercase ps-1">
       {t('ledger_query')}
      </span>
      <div className="relative group">
       <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-operational-cyan transition-colors" />
       <Input
        type="search"
        placeholder={t('search_placeholder')}
        value={searchFilter}
        onChange={(e) => { setSearchFilter(e.target.value); setPage(1); }}
        className="w-full h-12 ps-12 pe-4 bg-white/5 border border-border/50 focus:ring-2 focus:ring-operational-cyan/30 rounded-xl text-label-sm font-bold transition-all"
        dir={isRtl ? 'rtl' : 'ltr'} />
      </div>
     </div>

     <div className="flex flex-col gap-2 min-w-[200px] min-w-0">
      <span className="text-label-xxs font-semibold text-muted-foreground/60 uppercase ps-1">
       {t('document_class')}
      </span>
      <Select
       value={typeFilter}
       onValueChange={(val) => { if (val) { setTypeFilter(val === 'ALL' ? '' : val); setPage(1); } }}
      >
       <SelectTrigger className="h-12 bg-surface-container-highest/30 border-none rounded-xl text-label-xs font-semibold uppercase focus:ring-operational-cyan/30 transition-all px-6">
        <SelectValue placeholder={tc('active_status')} />
       </SelectTrigger>
       <SelectContent className="bg-card border border-border shadow-sm border border-border-muted/50 shadow-2xl rounded-2xl">
        <SelectItem value="ALL" className="text-label-xs font-semibold uppercase">{tc('active_status')}</SelectItem>
        <SelectItem value="GRN" className="text-label-xs font-semibold uppercase text-status-success">{t('types.grn')}</SelectItem>
        <SelectItem value="ISSUE" className="text-label-xs font-semibold uppercase text-status-warning">{t('types.issue')}</SelectItem>
        <SelectItem value="TRANSFER" className="text-label-xs font-semibold uppercase text-operational-cyan">{t('types.transfer')}</SelectItem>
        <SelectItem value="ADJUSTMENT" className="text-label-xs font-semibold uppercase text-indigo-400">{t('types.adjustment')}</SelectItem>
       </SelectContent>
      </Select>
     </div>
    </div>

    {data?.data && data.data.length > 0 && (
     <PermissionGate action="export" resource="inventory_movements">
      <div className="shrink-0 w-full sm:w-auto">
       <ExportMenu
        data={data.data as unknown as Record<string, unknown>[]}
        columns={[
         { header: 'Date', key: 'createdAt' },
         { header: 'Document Reference', key: 'documentReference' },
         { header: 'Type', key: 'transactionType' },
         { header: 'Item Name', key: 'itemName' },
         { header: 'Quantity', key: 'quantity' },
        ]}
        filename="inventory_movements"
        title={t('title') || 'Stock Movements'}
        onExportAll={handleExportAll}
       />
      </div>
     </PermissionGate>
    )}
   </div>

   <div className="bg-card border border-border shadow-sm rounded-2xl shadow-2xl border border-border-muted/50 overflow-hidden">
    {isError && (
     <div className="p-4 bg-status-error/10 border-b border-status-error/20 text-status-error text-label-sm font-semibold">
      Failed to load data: {(error instanceof Error ? error.message : 'Unknown error')}
     </div>
    )}
    <div className="flex-1 w-full min-h-[400px] md:min-h-0">
     <div className="hidden md:block w-full">
      <DataTable<InventoryMovement>
       columns={columns}
       data={data?.data ?? []}
       isLoading={isLoading}
       enableVirtualization={true}
       collectionName="inventory_operational_ledger"
       pagination={data?.meta ? {
        page: data.meta.page,
        pageSize: data.meta.pageSize,
        total: data.meta.total,
        totalPages: data.meta.totalPages,
        onPageChange: setPage
       } : undefined}
       emptyState={
        <div className="flex flex-col items-center justify-center py-32 gap-6 opacity-20 min-w-0">
         <History className="w-16 h-16 text-muted-foreground/60" />
         <div className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('zero_movement')}</div>
        </div>
       }
      />
     </div>

     {!isLoading && (data?.data ?? []).length > 0 && (
      <VirtualizedMobileGrid<InventoryMovement>
       data={data?.data ?? []}
       estimateSize={150}
       maxHeight={600}
       className="mt-4 p-4 block md:hidden"
       renderCard={(movement: InventoryMovement) => {
        const isEntry = movement.quantity > 0;
        return (
        <div 
         key={movement.id} 
         className="bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 rounded-lg p-3 flex flex-col gap-2 shadow-sm"
        >
         {/* TOP TIER: Identity */}
         <div className="flex justify-between items-start">
           <div className="flex flex-col gap-1 w-full">
             <div className="flex justify-between items-start gap-2">
               <span className="text-[11px] font-mono font-bold text-[#b48e67] uppercase">{movement.itemCode}#</span>
               <Badge variant="secondary" className={`${getTypeStyle(movement.transactionType)} text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-sm h-auto shrink-0 border-transparent`}>
                {t(`types.${movement.transactionType.toLowerCase()}` as 'types.grn' | 'types.issue' | 'types.transfer' | 'types.adjustment')}
              </Badge>
             </div>
             <span className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{movement.itemName}</span>
           </div>
         </div>

         {/* MIDDLE TIER: Financial/Qty */}
         <div className="flex items-center justify-between mt-1 p-2 bg-gray-50 dark:bg-black/20 rounded-md">
           <div className="flex flex-col">
             <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t('qty')}</span>
             <span dir="ltr" className={`font-mono text-sm font-bold ${isEntry ? 'text-status-success' : 'text-status-error'}`}>
               {isEntry ? '+' : '-'}{formatQuantity(Math.abs(movement.quantity), currentLocale as 'ar' | 'en')}
             </span>
           </div>
           <div className="flex flex-col items-end">
             <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t('direction')}</span>
             <div className={`flex items-center gap-1 font-semibold text-[10px] uppercase ${isEntry ? 'text-status-success' : 'text-status-error'}`}>
              {isEntry ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {isEntry ? t('in') : t('out')}
             </div>
           </div>
         </div>

         {/* BOTTOM TIER: Meta */}
         <div className="flex justify-between items-end pt-2 mt-1 border-t border-gray-100 dark:border-gray-800/50">
           <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground tabular-nums">
             <span dir="ltr">{formatDate(movement.timestamp, currentLocale as 'ar' | 'en')}</span>
           </div>
            <Link
             href={getDocumentPath(movement.transactionType, movement.documentId ?? null)}
             className="text-[10px] font-mono font-semibold text-operational-cyan hover:text-operational-cyan/80 transition-colors drop-shadow-[0_0_8px_rgba(var(--operational-cyan-rgb),0.3)]"
            >
            <span dir="ltr">{movement.documentReference}</span>
           </Link>
         </div>
        </div>
       );
      }}
      />
     )}
    </div>
   </div>
  </div>
 );
}
