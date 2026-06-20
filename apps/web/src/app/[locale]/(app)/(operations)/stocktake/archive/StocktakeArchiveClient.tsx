'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useStocktakeList, StocktakeSummary } from '@/features/operations/hooks/useStocktakeList';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { ColumnDef } from '@tanstack/react-table';
import { FileText, ClipboardCheck, Archive, Warehouse, Calendar, Search, Filter } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { QueryBoundary } from '@/core/query/QueryBoundary';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { STOCKTAKE_STATUS } from '@logirest/shared-types';
import { toast } from 'sonner';
import { z } from 'zod';
import { apiClient } from '@/infrastructure/api/client';

export function StocktakeArchiveClient({
 initialPage,
 initialWarehouseId,
 locale
}: {
 initialPage: number;
 initialWarehouseId?: string;
 locale: 'ar' | 'en'
}) {
 const t = useTranslations('operations.stocktake');
 const tc = useTranslations('common');
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();

 // For Archive, we only show POSTED and CLOSED sessions
 const { data, isLoading, error } = useStocktakeList({
  status: STOCKTAKE_STATUS.POSTED, // In a real scenario, this might support multiple archive statuses
  warehouse_id: initialWarehouseId,
  page: initialPage
 });

 const handlePageChange = (newPage: number) => {
  const params = new URLSearchParams(searchParams.toString());
  params.set('page', newPage.toString());
  router.push(`${pathname}?${params.toString()}`);
 };

 const columns = useMemo<ColumnDef<StocktakeSummary>[]>(() => [
  {
   accessorKey: 'sessionNumber',
   header: t('session_number') || 'Session',
   cell: ({ row }) => (
    <div className="flex flex-col min-w-0">
     <span dir="ltr" className="font-mono text-body-md font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
      {row.original.sessionNumber}
     </span>
     <div className="flex items-center gap-1.5 opacity-40 mt-1">
      <Calendar className="w-2.5 h-2.5" />
      <ClientOnlyTime 
       date={row.original.snapshotAt} 
       mode="datetime" 
       locale={locale as 'ar' | 'en'}
       className="text-label-xxs font-semibold tabular-nums"
      />
     </div>
    </div>
   ),
  },
  {
   accessorKey: 'warehouseId',
   header: tc('warehouse') || 'Warehouse',
   cell: ({ row }) => (
    <div className="flex items-center gap-2">
     <Warehouse className="w-3.5 h-3.5 text-muted-foreground/60" />
     <span className="font-medium text-label-sm">{row.original.warehouseName || '—'}</span>
    </div>
   ),
  },
  {
   accessorKey: 'status',
   header: tc('status_label') || 'State',
   cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
   id: 'actions',
   header: '',
   cell: ({ row }) => (
    <div className="flex justify-end pe-4">
     <Button
      variant="ghost"
      size="sm"
      className="h-8 px-4 text-label-xxs font-bold uppercase text-muted-foreground hover:text-foreground hover:bg-surface-container-highest/20 rounded-md transition-all"
      onClick={(e) => {
       e.stopPropagation();
       router.push(`/stocktake/${row.original.id}`);
      }}
     >
      {tc('view') || 'Inspect'}
     </Button>
    </div>
   ),
  },
 ], [t, tc, locale, router]);

 return (
  <div className="min-w-0 max-w-[1600px] flex-1 fade-in gap-6 duration-1000 slide-in-from-bottom-4 mx-auto animate-in flex-col flex space-y-10 w-full">
   <div className="flex flex-col gap-6 min-w-0">
    <Breadcrumb 
     items={[
      { label: tc('inventory'), href: '#' },
      { label: t('title'), href: `/stocktake` },
      { label: t('archive') || 'Archive', href: `/stocktake/archive` }
     ]} 
    />
    <PageHeader
     title={t('archive_title') || 'Stocktake Archive'}
     subtitle={t('archive_description') || 'Historical inventory audits and finalized verification sessions'}
     icon={<Archive className="w-8 h-8 text-muted-foreground/40" />}
    />
   </div>

   <QueryBoundary 
    isLoading={isLoading} 
    error={error}
    loadingFallback={<PageSkeleton />}
   >
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
     <MetricCard
      label={t('archived_sessions') || 'Archived Sessions'}
      value={data?.meta?.total || 0}
      icon={FileText}
      trend="neutral"
     />
     <MetricCard
      label={t('total_posted') || 'Total Posted'}
      value={data?.meta?.total || 0} // In a real scenario, this might filter specifically for POSTED
      icon={ClipboardCheck}
      trend="neutral"
      color="emerald"
     />
    </div>

    <div className="space-y-6">
     <div className="flex flex-wrap items-end gap-6 w-full p-8 bg-card border border-border shadow-sm rounded-lg border border-outline-low shadow-sm">
      <div className="flex flex-col gap-3 min-w-[340px] flex-1 min-w-0">
       <div className="flex items-center gap-2 ms-1">
        <Search className="w-3 h-3 text-muted-foreground/40" />
        <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tc('search')}</label>
       </div>
       <div className="relative group">
        <input
         placeholder={t('search_placeholder') || 'Search Archive...'} 
         className="w-full bg-surface-container-highest/10 border border-outline-low h-12 px-6 text-label-sm font-semibold rounded-md outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
       </div>
      </div>

      <Button className="h-12 px-8 bg-surface-container-highest/40 hover:bg-surface-container-highest/60 text-foreground/60 text-label-xs font-semibold uppercase rounded-md transition-all border border-outline-low">
       <Filter className="w-3 h-3 me-2" />
       {tc('filters_button')}
      </Button>
      <Button 
       className="h-12 px-8 bg-operational-cyan/10 hover:bg-operational-cyan/20 text-operational-cyan text-label-xs font-semibold uppercase rounded-md transition-all border border-operational-cyan/20"
       onClick={async () => {
        try {
         const res = await apiClient.get('/operations/stocktakes/variance-export', z.unknown());
         const blob = new Blob([res as string], { type: 'text/csv;charset=utf-8;' });
         const link = document.createElement("a");
         const url = URL.createObjectURL(blob);
         link.setAttribute("href", url);
         link.setAttribute("download", `stocktake_variances_${new Date().toISOString().split('T')[0]}.csv`);
         link.style.visibility = 'hidden';
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         toast.success(t('export_success') || 'Audit variance exported successfully');
        } catch (err) {
         toast.error(tc('error_generic') || 'An error occurred');
        }
       }}
      >
       <FileText className="w-3 h-3 me-2" />
       {t('export_audit') || 'Export Audit'}
      </Button>
     </div>

     <div className="flex-1 w-full min-h-[400px] md:min-h-0">
      <DataTable
       columns={columns}
       data={data?.data || []}
       isLoading={false}
       onRowClick={(row: StocktakeSummary) => router.push(`/stocktake/${row.id}`)}
       collectionName="operations_stocktake"
       emptyState={
        <EmptyState 
         title={t('no_archive_records') || 'No Archived Records'} 
         description={t('archive_empty_description') || 'Historical stocktake sessions will appear here once finalized.'} 
        />
       }
       pagination={data?.meta ? {
        page: data.meta.page,
        pageSize: data.meta.pageSize,
        total: data.meta.total,
        totalPages: data.meta.totalPages,
        onPageChange: handlePageChange
       } : undefined}
      />
     </div>
    </div>
   </QueryBoundary>
  </div>
 );
}
