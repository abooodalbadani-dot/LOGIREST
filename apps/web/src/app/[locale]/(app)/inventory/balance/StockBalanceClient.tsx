'use client';

import { useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useTranslations, useLocale } from 'next-intl';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { VirtualizedMobileGrid } from '@/components/shared/VirtualizedMobileGrid';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useInventoryBalance } from '@/features/inventory/hooks/useInventoryBalance';
import { generateExcel } from '@/utils/export';
import type { StockBalanceItem } from '@/types/inventory';

import { formatNumber, formatCurrency, getCurrencyDisplayName } from '@/utils/currency';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
 Package, 
 AlertTriangle, 
 Clock, 
 Wallet, 
 Search, 
 Plus, 
 Download, 
 Scan, 
 Scale, 
 Edit2, 
 Trash2,
 ChevronLeft,
 ChevronRight
} from 'lucide-react';

import { Link, useRouter } from '@/i18n/navigation';
import { useBaseCurrency } from '@/hooks/useBaseCurrency';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ReportHeader } from '@/components/shared/ReportHeader';
import { PageHeader } from '@/components/shared/PageHeader';

export default function StockBalanceClient() {
 const t = useTranslations('operational.inventory');
 const tc = useTranslations('common');
 const currentLocale = useLocale();
 const router = useRouter();
 const isRtl = currentLocale === 'ar';

 const { currency: baseCurrency } = useBaseCurrency();

 const [warehouseFilter] = useState('');
 const [searchFilter, setSearchFilter] = useState('');
 const [statusFilter, setStatusFilter] = useState('all');
 const [page, setPage] = useState(1);
 const debouncedSearch = useDebounce(searchFilter, 300);

 const { data, isLoading } = useInventoryBalance({
  warehouse_id: warehouseFilter && warehouseFilter !== 'all' ? warehouseFilter : undefined,
  search: debouncedSearch || undefined,
  page,
 });

 const filteredItems = useMemo(() => {
  if (!data?.data) return [];
  return data.data.filter(item => {
   if (statusFilter === 'low') {
    return item.qtyAvailable <= item.reorderPoint;
   }
   if (statusFilter === 'out') {
    return item.qtyAvailable === 0;
   }
   return true;
  });
 }, [data?.data, statusFilter]);

 const columns = useMemo<ColumnDef<StockBalanceItem, unknown>[]>(() => [
  {
   accessorKey: 'itemCode',
   header: tc('table_headers.code'),
   cell: ({ row }) => {
    const barcode = row.original.primaryBarcode;
    return (
     <div className="flex flex-col gap-0.5">
      <span dir="ltr" className="font-mono text-label-xs font-semibold text-muted-foreground/60 uppercase">
       {row.original.itemCode}#
      </span>
      <div className="flex items-center gap-1">
       <Scan className="w-3 h-3 text-muted-foreground/40 shrink-0" />
       {barcode ? (
        <span dir="ltr" className="font-mono text-[11px] text-muted-foreground/50 tracking-wide">
         {barcode}
        </span>
       ) : (
        <span className="text-[11px] text-muted-foreground/30 italic">
         {tc('no_barcode') || 'No Barcode'}
        </span>
       )}
      </div>
     </div>
    );
   },
  },
  {
   id: 'item_name',
   header: tc('table_headers.name'),
   cell: ({ row }) => {
    const image = row.original.image;
    return (
     <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-surface-container-highest/50 flex items-center justify-center border border-surface-variant/10 group-hover:bg-operational-cyan/10 transition-colors overflow-hidden shrink-0">
       {image ? (
        <img
         src={image}
         alt={row.original.itemName || ''}
         className="w-full h-full object-cover"
        />
       ) : (
        <Package className="w-4 h-4 text-muted-foreground/60 transition-colors" />
       )}
      </div>
      <span className="font-semibold text-label-sm text-foreground group-hover:text-operational-cyan transition-colors">
       {row.original.itemName}
      </span>
     </div>
    );
   },
  },
  {
   id: 'warehouse',
   header: tc('warehouse'),
   cell: ({ row }) => (
    <span className="text-label-xs font-bold text-foreground/80">
     {row.original.warehouseName}
    </span>
   ),
  },
  {
   accessorKey: 'qtyAvailable',
   header: tc('table_headers.available'),
   cell: ({ row }) => {
    const qty = row.original.qtyAvailable;
    const reorderPoint = row.original.reorderPoint;
    const isOutOfStock = qty === 0;
    const isLowStock = qty <= reorderPoint;
    return (
     <span 
      dir="ltr" 
      className={`font-mono text-label-sm font-semibold ${
       isOutOfStock 
        ? 'text-status-error font-bold' 
        : isLowStock 
         ? 'text-status-warning' 
         : 'text-foreground'
      }`}
     >
      {formatNumber(qty, currentLocale as 'ar' | 'en', 2)}
     </span>
    );
   },
  },
  {
   id: 'unit',
   header: tc('table_headers.uom'),
   cell: ({ row }) => (
    <span className="text-label-xs font-semibold text-muted-foreground/60 uppercase">
     {row.original.uomCode || tc('uoms.kg')}
    </span>
   ),
  },
  {
   id: 'status',
   header: tc('status_label'),
   cell: ({ row }) => {
    const qty = row.original.qtyAvailable;
    const reorderPoint = row.original.reorderPoint;
    
    if (qty === 0) {
     return <StatusBadge status="OUT_OF_STOCK" className="h-6" />;
    }
    if (qty <= reorderPoint) {
     return <StatusBadge status="LOW_STOCK" className="h-6" />;
    }
    return <StatusBadge status="HEALTHY" className="h-6" />;
   }
  },
  {
   id: 'actions',
   header: '',
   cell: () => (
    <div className="flex items-center justify-end gap-2">
     <PermissionGate action="update" resource="inventory">
      <Button variant="ghost" size="icon" aria-label={tc('edit')} className="w-8 h-8 rounded-lg hover:bg-operational-cyan/10 hover:text-operational-cyan text-muted-foreground/60 transition-all">
       <Edit2 className="w-3.5 h-3.5" />
      </Button>
     </PermissionGate>
     <PermissionGate action="delete" resource="inventory">
      <Button variant="ghost" size="icon" aria-label={tc('delete')} className="w-8 h-8 rounded-lg hover:bg-status-error/10 hover:text-status-error text-muted-foreground/60 transition-all">
       <Trash2 className="w-3.5 h-3.5" />
      </Button>
     </PermissionGate>
    </div>
   ),
  },
 ], [t, tc, isRtl, currentLocale]);

 const handleExport = () => {
  if (!data?.data) return;
  const exportColumns = [
   { header: tc('table_headers.code'), key: 'itemCode', width: 15 },
   { header: tc('table_headers.name'), key: 'itemName', width: 30 },
   { header: tc('warehouse'), key: 'warehouseName', width: 25 },
   { header: tc('table_headers.qty'), key: 'qtyOnHand', width: 12 },
   { header: tc('table_headers.available'), key: 'qtyAvailable', width: 12 },
  ];

  const rows = data.data.map(item => ({
   ...item,
  }));

  generateExcel(exportColumns, rows, 'Stock_Balances');
 };

 const totalItems = data?.meta?.total ?? 0;
 
 const lowStockItems = useMemo(() => {
  if (!data?.data) return 0;
  return data.data.filter(item => item.qtyAvailable <= item.reorderPoint).length;
 }, [data?.data]);

 const nearExpiry = 0; // Expiry calculations belong to the Lots module, not stock balances

 const totalValue = useMemo(() => {
  if (!data?.data) return 0;
  return data.data.reduce((sum, item) => sum + (item.qtyAvailable * (item.wac || 0)), 0);
 }, [data?.data]);

 return (
  <div className="text-foreground min-w-0 bg-card flex-1 gap-6 selection:bg-operational-cyan/30 selection:text-operational-cyan flex-col flex min-h-screen w-full overflow-hidden">
   <div className="flex-1 w-full max-w-full min-w-0 overflow-hidden px-4 md:px-6 pb-32 mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-200">
    
    <ReportHeader />

    <PageHeader title={isRtl ? 'نظرة عامة على' : 'Inventory'} highlight={isRtl ? 'المخزون' : 'Overview'} />

    <div className="flex flex-col md:flex-row items-center justify-between gap-6 min-w-0 w-full max-w-full">
     <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto max-w-full">
      <div className="relative group w-full max-w-full sm:w-80">
       <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-operational-cyan transition-colors z-10" />
       <Input 
        type="text"
        placeholder={t('search_placeholder')}
        value={searchFilter}
        onChange={(e) => setSearchFilter(e.target.value)}
        className="w-full h-12 ps-12 pe-4 bg-card border border-border shadow-sm/50 border-none rounded-2xl text-label-xs font-bold transition-all"
       />
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 justify-end w-full sm:w-auto">
       <PermissionGate action="create" resource="inventory">
        <Link href="/master-data/items/new" className="w-full sm:w-auto">
         <Button className="w-full sm:w-auto h-12 px-6 bg-primary hover:bg-primary/90 text-white rounded-2xl gap-3 shadow-sm shadow-primary/20">
          <Plus className="w-4 h-4" />
          <span className="text-label-xs font-semibold uppercase">{t('add_item')}</span>
         </Button>
        </Link>
       </PermissionGate>
       <Button 
        variant="default" 
        onClick={handleExport}
        className="px-6 py-2.5 bg-foreground text-background font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
       >
        <Download className="w-4 h-4 text-background me-3 transition-transform group-hover:-translate-y-0.5" />
        <span className="text-label-xs font-semibold uppercase">{t('export')}</span>
       </Button>
      </div>
     </div>
    </div>

    {/* KPI Cards */}
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full min-w-0">
     <MetricCard
      label={t('total_value')}
      value={formatCurrency(totalValue, baseCurrency, currentLocale as 'ar' | 'en')}
      icon={Wallet}
      color="emerald"
      trend={getCurrencyDisplayName(baseCurrency, currentLocale as 'ar' | 'en')}
     />
     <MetricCard
      label={t('near_expiry')}
      value={nearExpiry}
      icon={Clock}
      color="amber"
     />
     <MetricCard
      label={t('low_stock')}
      value={lowStockItems}
      icon={AlertTriangle}
      color="rose"
     />
     <MetricCard
      label={t('total_sku')}
      value={formatNumber(totalItems, currentLocale as 'ar' | 'en')}
      icon={Package}
     />
    </div>

    {/* Table Filter Bar */}
    <div className="flex flex-wrap items-center gap-6 bg-card border border-border shadow-sm/30 p-6 rounded-3xl shadow-inner">
     <div className="flex items-center gap-3">
      <span className="text-label-xs font-semibold text-muted-foreground/60 uppercase">{t('filter_category')}</span>
      <Select value="all">
       <SelectTrigger className="w-48 bg-card border border-border shadow-sm border-none rounded-xl h-10 text-label-xs font-semibold uppercase">
        <SelectValue placeholder={t('filter_all')} />
       </SelectTrigger>
       <SelectContent className="bg-card border border-border shadow-sm border-surface-variant/10">
        <SelectItem value="all">{t('filter_all')}</SelectItem>
       </SelectContent>
      </Select>
     </div>
     <div className="flex items-center gap-3">
      <span className="text-label-xs font-semibold text-muted-foreground/60 uppercase">{t('filter_status')}</span>
      <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
       <SelectTrigger className="w-48 bg-card border border-border shadow-sm border-none rounded-xl h-10 text-label-xs font-semibold uppercase">
        <SelectValue placeholder={t('filter_all')} />
       </SelectTrigger>
       <SelectContent className="bg-card border border-border shadow-sm border-surface-variant/10">
        <SelectItem value="all">{t('filter_all')}</SelectItem>
        <SelectItem value="low">{t('low_stock')}</SelectItem>
        <SelectItem value="out">{tc('statuses.out_of_stock')}</SelectItem>
       </SelectContent>
      </Select>
     </div>
     
     <div className="flex-1" />
    </div>

    {/* Data Table */}
    <div className="flex-1 w-full min-h-[400px] md:min-h-0">
     <div className="hidden md:block w-full">
      <DataTable
       columns={columns}
       data={filteredItems}
       isLoading={isLoading}
       collectionName="inventory_orchestration_feed"
       enableVirtualization={true}
       pagination={{
        page,
        pageSize: data?.meta?.pageSize ?? 15,
        total: data?.meta?.total ?? 0,
        totalPages: data?.meta?.totalPages ?? 0,
        onPageChange: setPage,
       }}
       emptyState={<EmptyState variant="minimal" title={t('empty_title') || 'No Stock Records'} description={t('empty_description') || 'No inventory items found. Try adjusting your filters or add items via master data.'} />}
      />
     </div>

     {!isLoading && filteredItems.length > 0 && (
      <VirtualizedMobileGrid
       data={filteredItems}
       estimateSize={150}
       maxHeight={600}
       className="mt-4"
       keyExtractor={(item) => `${item.itemCode}-${item.warehouseId}`}
       renderCard={(item) => {
        const qty = item.qtyAvailable;
        const reorderPoint = item.reorderPoint;
        const isOutOfStock = qty === 0;
        const isLowStock = qty <= reorderPoint;
        
        return (
        <div 
         className="bg-surface-lowest dark:bg-surface-container rounded-xl p-3 flex flex-col gap-2 shadow-sm border-0"
        >
         {/* TOP TIER: Identity */}
         <div className="flex justify-between items-start">
           <div className="flex flex-col gap-1 w-full">
             <div className="flex justify-between items-start gap-2">
               <div className="flex items-center gap-2">
                 <div className="w-6 h-6 rounded-md bg-surface-container-highest/50 flex items-center justify-center border border-surface-variant/10 shrink-0">
                  <Package className="w-3 h-3 text-muted-foreground/60" />
                 </div>
                 <span className="text-sm font-bold text-foreground line-clamp-1">{item.itemName}</span>
               </div>
               {isOutOfStock ? (
                <StatusBadge status="OUT_OF_STOCK" className="px-1.5 py-0.5 text-[9px] rounded-md h-auto shrink-0" />
               ) : isLowStock ? (
                <StatusBadge status="LOW_STOCK" className="px-1.5 py-0.5 text-[9px] rounded-md h-auto shrink-0" />
               ) : (
                <StatusBadge status="HEALTHY" className="px-1.5 py-0.5 text-[9px] rounded-md h-auto shrink-0" />
               )}
              </div>
               <div className="flex items-center justify-between gap-2 mt-1">
                <div className="flex flex-col gap-0.5">
                 <span className="text-[11px] font-mono font-bold text-operational-cyan uppercase">{item.itemCode}#</span>
                 <div className="flex items-center gap-1">
                  <Scan className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0" />
                  {item.primaryBarcode ? (
                   <span dir="ltr" className="font-mono text-[10px] text-muted-foreground/50 tracking-wide">
                    {item.primaryBarcode}
                   </span>
                  ) : (
                   <span className="text-[10px] text-muted-foreground/30 italic">
                    {tc('no_barcode') || 'No Barcode'}
                   </span>
                  )}
                 </div>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground truncate">{item.warehouseName}</span>
               </div>
           </div>
         </div>

         {/* MIDDLE TIER: Financial/Qty */}
         <div className="flex items-center justify-between mt-1 p-2 bg-surface-container rounded-md">
           <div className="flex flex-col">
             <span className="text-[10px] text-muted-foreground font-semibold uppercase">{tc('table_headers.available')}</span>
             <span dir="ltr" className={`font-mono text-sm font-bold ${isOutOfStock ? 'text-status-error' : isLowStock ? 'text-status-warning' : 'text-foreground'}`}>
               {formatNumber(qty, currentLocale as 'ar' | 'en', 2)} <span className="text-[10px] text-muted-foreground ml-1">{item.uomCode || tc('uoms.kg')}</span>
             </span>
           </div>
         </div>

         {/* BOTTOM TIER: Actions */}
         <div className="flex justify-end items-end pt-2 mt-1 border-t border-border/20">
           <div className="flex gap-2 shrink-0">
            <PermissionGate action="update" resource="inventory">
             <Button variant="ghost" size="sm" className="px-6 py-2.5 bg-foreground text-background font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              <Edit2 className="w-3.5 h-3.5" />
             </Button>
            </PermissionGate>
            <PermissionGate action="delete" resource="inventory">
             <Button variant="ghost" size="sm" className="h-8 px-3 rounded-md text-xs font-bold text-status-error bg-status-error/10 hover:bg-status-error/20">
              <Trash2 className="w-3.5 h-3.5" />
             </Button>
            </PermissionGate>
           </div>
         </div>
        </div>
        );
       }}
      />
     )}
    </div>

    {/* Floating Quick Actions Bar */}
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-between gap-3 md:gap-6 bg-card/70 backdrop-blur-xl border border-brand-gold/30 shadow-2xl rounded-full px-6 py-3 z-50 w-[95vw] md:w-max max-w-2xl transition-all overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden animate-in slide-in-from-bottom-4 duration-500">
     <div className="flex items-center gap-2 border-e border-brand-gold/20 pe-4 md:pe-6 shrink-0">
      <span className="text-muted-foreground text-xs tracking-wider uppercase font-medium leading-none">{t('quick_actions')}</span>
     </div>
    
     <div className="flex items-center gap-2 md:gap-4 shrink-0">
      <PermissionGate action="view" resource="inventory">
       <button 
        onClick={() => router.push('/inventory/scan-mode')}
        className="flex items-center gap-2 md:gap-3 px-3 py-1.5 text-label-xs md:text-label-sm font-black uppercase text-foreground/80 dark:text-white hover:bg-brand-gold/10 hover:text-brand-gold transition-colors rounded-lg active:scale-95 group shrink-0"
       >
        <Scan className="w-4 h-4 md:w-5 md:h-5 text-brand-gold transition-transform group-hover:scale-110" />
        <span className="hidden sm:inline">{t('barcode_scanner')}</span>
       </button>
      </PermissionGate>
      
      <div className="w-px h-6 bg-brand-gold/20 shrink-0" />
      
      <PermissionGate action="create" resource="adjustment">
       <button 
        onClick={() => router.push('/adjustments/new')}
        className="flex items-center gap-2 md:gap-3 px-3 py-1.5 text-label-xs md:text-label-sm font-black uppercase text-foreground/80 dark:text-white hover:bg-brand-gold/10 hover:text-brand-gold transition-colors rounded-lg active:scale-95 group shrink-0"
       >
        <Scale className="w-4 h-4 md:w-5 md:h-5 text-brand-gold transition-transform group-hover:scale-110" />
        <span className="hidden sm:inline">{t('reconciliation')}</span>
       </button>
      </PermissionGate>
     </div>
    </div>
   </div>
  </div>
 );
}
