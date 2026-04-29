'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useInventoryBalance } from '@/features/inventory/hooks/useInventoryBalance';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { WarehouseSchema } from '@/types/master-data';
import { generateExcel } from '@/utils/export';
import type { StockBalanceItem } from '@/types/inventory';
import { cn } from '@/lib/utils';
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
  Printer, 
  Scale, 
  Edit2, 
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/ui/status-badge';

interface StockBalanceClientProps {
  title: string;
}

export default function StockBalanceClient({ title }: StockBalanceClientProps) {
  const t = useTranslations('operational.inventory');
  const tc = useTranslations('common');
  const currentLocale = useLocale();
  const isRtl = currentLocale === 'ar';

  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: warehouses } = useMasterDataList('warehouses', WarehouseSchema);
  const { data, isLoading } = useInventoryBalance({
    warehouse_id: warehouseFilter && warehouseFilter !== 'all' ? warehouseFilter : undefined,
    search: searchFilter || undefined,
    page,
  });

  const columns = useMemo<ColumnDef<StockBalanceItem, unknown>[]>(() => [
    {
      accessorKey: 'item_code',
      header: tc('table_headers.code'),
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-[10px] font-black text-muted-foreground/60/60 uppercase tracking-tighter">
          {row.original.item_code}#
        </span>
      ),
    },
    {
      id: 'item_name',
      header: tc('table_headers.name'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container-highest/50 flex items-center justify-center border border-surface-variant/10 group-hover:bg-operational-cyan/10 transition-colors">
             <Package className="w-4 h-4 text-muted-foreground/60/40 group-hover:text-operational-cyan transition-colors" />
          </div>
          <span className="font-black text-xs text-foreground tracking-tight group-hover:text-operational-cyan transition-colors">
            {isRtl ? row.original.item_name_ar : row.original.item_name_en}
          </span>
        </div>
      ),
    },
    {
      id: 'warehouse',
      header: tc('warehouse'),
      cell: ({ row }) => (
        <span className="text-[11px] font-bold text-foreground/80">
          {isRtl ? row.original.warehouse_name_ar : row.original.warehouse_name_en}
        </span>
      ),
    },
    {
      accessorKey: 'qty_available',
      header: tc('table_headers.available'),
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-xs font-black text-foreground">
          {row.original.qty_available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      id: 'unit',
      header: tc('table_headers.uom'),
      cell: ({ row }) => (
        <span className={cn("text-[10px] font-black text-muted-foreground/60/60 uppercase", isRtl ? "tracking-normal" : "tracking-[0.05em]")}>
           {tc('uoms.kg')}
        </span>
      ),
    },
    {
      id: 'status',
      header: tc('status_label'),
      cell: ({ row }) => {
        const qty = row.original.qty_available;
        const reorderPoint = row.original.reorder_point;
        const isLow = qty < reorderPoint;
        const isCritical = qty <= 5; // Placeholder logic
        
        if (isCritical) {
          return <StatusBadge status="CRITICAL" className="h-6" />;
        }
        if (isLow) {
          return <StatusBadge status="LOW" className="h-6" />;
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
            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-operational-cyan/10 hover:text-operational-cyan text-muted-foreground/60/40 transition-all">
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          </PermissionGate>
          <PermissionGate action="delete" resource="inventory">
            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-status-error/10 hover:text-status-error text-muted-foreground/60/40 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ], [t, tc, isRtl]);

  const handleExport = () => {
    if (!data?.data) return;
    const exportColumns = [
      { header: tc('table_headers.code'), key: 'item_code', width: 15 },
      { header: tc('table_headers.name'), key: 'item_name', width: 30 },
      { header: tc('warehouse'), key: 'warehouse_name', width: 25 },
      { header: tc('table_headers.qty'), key: 'qty_on_hand', width: 12 },
      { header: tc('table_headers.available'), key: 'qty_available', width: 12 },
    ];

    const rows = data.data.map(item => ({
      ...item,
      item_name: isRtl ? item.item_name_ar : item.item_name_en,
      warehouse_name: isRtl ? item.warehouse_name_ar : item.warehouse_name_en,
    }));

    generateExcel(exportColumns, rows, 'Stock_Balances');
  };

  const totalItems = data?.meta?.total ?? 1284; 
  const lowStockItems = 12; 
  const nearExpiry = 8; 
  const totalValue = 452300; 

  return (
    <div className="min-h-screen bg-surface-container-lowest text-foreground selection:bg-operational-cyan/30 selection:text-operational-cyan">
      <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-1 w-full md:w-auto text-start">
             <h1 className="text-3xl font-black tracking-tight text-foreground">
                {t('title')}
             </h1>
             <p className={cn("text-[11px] font-black text-muted-foreground/60/40 uppercase", isRtl ? "tracking-normal" : "tracking-[0.05em]")}>
                {t('subtitle')}
             </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative group flex-1 md:w-80">
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60/40 group-focus-within:text-operational-cyan transition-colors z-10" />
              <Input 
                type="text"
                placeholder={t('search_placeholder')}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full h-12 ps-12 pe-4 bg-surface-container-low/50 border-none rounded-2xl text-[11px] font-bold transition-all"
              />
            </div>
            <PermissionGate action="create" resource="inventory">
              <Link href={`/${currentLocale}/master-data/items/new`}>
                <Button className="h-12 px-6 bg-primary hover:bg-primary/90 text-white rounded-2xl gap-3 shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4" />
                  <span className="text-[11px] font-black uppercase tracking-[0.08em]">{t('add_item')}</span>
                </Button>
              </Link>
            </PermissionGate>
            <Button 
              variant="outline" 
              onClick={handleExport}
              className="h-12 px-6 bg-surface-container-low border-surface-variant/10 hover:bg-surface-container-medium rounded-2xl gap-3 transition-all"
            >
              <Download className="w-4 h-4 text-operational-cyan" />
              <span className={cn("text-[11px] font-black uppercase", isRtl ? "tracking-normal" : "tracking-[0.08em]")}>{t('export')}</span>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            label={t('total_value')}
            value={totalValue.toLocaleString()}
            icon={Wallet}
            color="emerald"
            trend={tc('currencies.sar_full')}
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
            value={totalItems.toLocaleString()}
            icon={Package}
          />
        </div>

        {/* Table Filter Bar */}
        <div className="flex flex-wrap items-center gap-6 bg-surface-container-low/30 p-6 rounded-3xl border border-surface-variant/10 shadow-inner">
           <div className="flex items-center gap-3">
              <span className={cn("text-[10px] font-black text-muted-foreground/60/40 uppercase", isRtl ? "tracking-normal" : "tracking-[0.05em]")}>{t('filter_category')}</span>
              <Select value="all">
                <SelectTrigger className="w-48 bg-surface-container-low border-none rounded-xl h-10 text-[11px] font-black uppercase tracking-tight">
                  <SelectValue placeholder={t('filter_all')} />
                </SelectTrigger>
                <SelectContent className="bg-surface-container-low border-surface-variant/10">
                   <SelectItem value="all">{t('filter_all')}</SelectItem>
                </SelectContent>
              </Select>
           </div>
           <div className="flex items-center gap-3">
              <span className={cn("text-[10px] font-black text-muted-foreground/60/40 uppercase", isRtl ? "tracking-normal" : "tracking-[0.05em]")}>{t('filter_status')}</span>
              <Select value="all">
                <SelectTrigger className="w-48 bg-surface-container-low border-none rounded-xl h-10 text-[11px] font-black uppercase tracking-tight">
                  <SelectValue placeholder={t('filter_all')} />
                </SelectTrigger>
                <SelectContent className="bg-surface-container-low border-surface-variant/10">
                   <SelectItem value="all">{t('filter_all')}</SelectItem>
                </SelectContent>
              </Select>
           </div>
           
           <div className="flex-1" />

           <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="w-10 h-10 rounded-xl bg-surface-container-low/50 border border-surface-variant/10"
              >
                 <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </Button>
              <div className={cn("text-[10px] font-black uppercase px-4 opacity-40", isRtl ? "tracking-normal" : "tracking-[0.05em]")}>
                {t('pagination_info', { 
                  start: ((page - 1) * 15) + 1, 
                  end: Math.min(page * 15, totalItems), 
                  total: totalItems.toLocaleString() 
                })}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setPage(p => p + 1)}
                className="w-10 h-10 rounded-xl bg-surface-container-low/50 border border-surface-variant/10"
              >
                 <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </Button>
           </div>
        </div>

        {/* Data Table */}
        <div className="bg-surface-container-low/20 rounded-[2.5rem] border border-surface-variant/10 overflow-hidden shadow-2xl">
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            isLoading={isLoading}
            collectionName="inventory_orchestration_feed"
            pagination={{
              page,
              pageSize: data?.meta?.page_size ?? 15,
              total: data?.meta?.total ?? 0,
              totalPages: data?.meta?.total_pages ?? 0,
              onPageChange: setPage,
            }}
            emptyState={<EmptyState title={t('empty_title') || 'No Stock Records'} description={t('empty_description') || 'No inventory items found. Try adjusting your filters or add items via master data.'} />}
          />
        </div>

        {/* Floating Quick Actions Bar */}
        <div className="fixed bottom-12 start-1/2 -translate-x-1/2 z-50">
           <div className="flex items-center gap-8 bg-surface-ledger/90 backdrop-blur-xl border border-operational-cyan/20 px-10 h-16 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(var(--primary-rgb),0.1)] transition-all">
              <div className="flex items-center gap-3 border-e border-surface-variant/10 pe-8">
                 <span className={cn("text-[10px] font-black uppercase text-muted-foreground/60/40", isRtl ? "tracking-normal" : "tracking-[0.05em]")}>{t('quick_actions')}</span>
              </div>
              
              <div className="flex items-center gap-6">
                 <PermissionGate action="view" resource="inventory">
                       <button 
                      onClick={() => window.location.href = `/${currentLocale}/inventory/scan`}
                      className={cn("flex items-center gap-3 text-[11px] font-black uppercase text-foreground hover:text-operational-cyan transition-colors", isRtl ? "tracking-normal" : "tracking-[0.08em]")}
                    >
                       <Scan className="w-4 h-4 text-operational-cyan" />
                       {t('barcode_scanner')}
                    </button>
                 </PermissionGate>
                 <div className="w-px h-6 bg-surface-variant/10" />
                 <button 
                   onClick={() => window.print()}
                   className={cn("flex items-center gap-3 text-[11px] font-black uppercase text-foreground hover:text-operational-cyan transition-colors", isRtl ? "tracking-normal" : "tracking-[0.08em]")}
                 >
                    <Printer className="w-4 h-4 text-operational-cyan/60" />
                    {t('print_labels')}
                 </button>
                 <div className="w-px h-6 bg-surface-variant/10" />
                  <PermissionGate action="create" resource="adjustment">
                    <button 
                      onClick={() => window.location.href = `/${currentLocale}/adjustments/new`}
                      className={cn("flex items-center gap-3 text-[11px] font-black uppercase text-foreground hover:text-operational-cyan transition-colors", isRtl ? "tracking-normal" : "tracking-[0.08em]")}
                    >
                       <Scale className="w-4 h-4 text-operational-cyan/60" />
                       {t('reconciliation')}
                    </button>
                  </PermissionGate>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
