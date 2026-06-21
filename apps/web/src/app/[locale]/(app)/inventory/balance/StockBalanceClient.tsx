'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable/DataTable';
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

 const { data, isLoading } = useInventoryBalance({
  warehouse_id: warehouseFilter && warehouseFilter !== 'all' ? warehouseFilter : undefined,
  search: searchFilter || undefined,
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
   cell: ({ row }) => (
    <span dir="ltr" className="font-mono text-label-xs font-semibold text-muted-foreground/60 uppercase">
     {row.original.itemCode}#
    </span>
   ),
  },
  {
   id: 'item_name',
   header: tc('table_headers.name'),
   cell: ({ row }) => (
    <div className="flex items-center gap-3">
     <div className="w-8 h-8 rounded-lg bg-surface-container-highest/50 flex items-center justify-center border border-surface-variant/10 group-hover:bg-operational-cyan/10 transition-colors">
      <Package className="w-4 h-4 text-muted-foreground/60 transition-colors" />
     </div>
     <span className="font-semibold text-label-sm text-foreground group-hover:text-operational-cyan transition-colors">
      {row.original.itemName}
     </span>
    </div>
   ),
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
   <div className="flex-1 w-full max-w-full min-w-0 overflow-hidden px-4 md:px-6 pb-32 mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
    
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
        className="w-full sm:w-auto h-12 px-8 bg-operational-cyan hover:bg-operational-cyan/90 text-white text-label-xs font-bold uppercase rounded-xl shadow-sm shadow-operational-cyan/20 transition-all border-none group"
       >
        <Download className="w-4 h-4 text-white me-3 transition-transform group-hover:-translate-y-0.5" />
        <span className="text-label-xs font-semibold uppercase">{t('export')}</span>
       </Button>
      </div>
     </div>
    </div>

    {/* KPI Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
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
     <DataTable
      columns={columns}
      data={filteredItems}
      isLoading={isLoading}
      collectionName="inventory_orchestration_feed"
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
