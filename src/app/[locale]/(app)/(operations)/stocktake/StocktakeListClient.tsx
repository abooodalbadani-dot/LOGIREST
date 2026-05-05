'use client';
 
import { useMemo } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, usePathname, Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useStocktakeList, StocktakeSummary } from '@/features/operations/hooks/useStocktakeList';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { ColumnDef } from '@tanstack/react-table';
import { FileText, ClipboardCheck, AlertCircle, Plus, Filter, Search, Warehouse, Calendar, History } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isPendingStatus, isPostedStatus, type DocumentStatus } from '@/core/workflow/document-engine';
import { QueryBoundary } from '@/core/query/QueryBoundary';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

export function StocktakeListClient({
 initialStatus,
 initialPage,
 initialWarehouseId,
 locale
}: {
 initialStatus?: string;
 initialPage: number;
 initialWarehouseId?: string;
 locale: 'ar' | 'en'
}) {
 const t = useTranslations('operations.stocktake');
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();
 const tc = useTranslations('common');

 const { data, isLoading } = useStocktakeList({
 status: initialStatus,
 warehouse_id: initialWarehouseId,
 page: initialPage
 });

 const handleStatusChange = (val: string | null) => {
 const params = new URLSearchParams(searchParams.toString());
 if (val && val !== 'ALL') {
 params.set('status', val);
 } else {
 params.delete('status');
 }
 params.set('page', '1');
 router.push(`${pathname}?${params.toString()}`);
 };

 const handlePageChange = (newPage: number) => {
 const params = new URLSearchParams(searchParams.toString());
 params.set('page', newPage.toString());
 router.push(`${pathname}?${params.toString()}`);
 };

 const columns = useMemo<ColumnDef<StocktakeSummary>[]>(() => [
 {
 accessorKey: 'session_number',
 header: t('session_number') || 'Session',
 cell: ({ row }) => (
 <div className="flex flex-col">
 <span dir="ltr" className="font-mono text-body-md font-semibold text-cyan-500 group-hover:text-cyan-400 transition-colors">
 {row.original.session_number}
 </span>
 <span className="text-label-xxs font-semibold text-muted-foreground/40 uppercase">
 Operational Audit
 </span>
 <div className="flex items-center gap-1.5 opacity-20 mt-1">
 <Calendar className="w-2.5 h-2.5" />
 <span dir="ltr" className="text-label-xxs font-semibold tabular-nums">
 {format(new Date(row.original.snapshot_at), 'MMM dd, HH:mm')}
 </span>
 </div>
 </div>
 ),
 },
 {
 accessorKey: 'warehouse_id',
 header: tc('warehouse') || 'Warehouse',
 cell: ({ row }) => (
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 rounded-lg bg-surface-container-highest/30 flex items-center justify-center border border-outline-low">
 <Warehouse className="w-3.5 h-3.5 text-muted-foreground/60" />
 </div>
 <span className="font-bold text-label-sm text-foreground/80">{row.original.warehouse_id}</span>
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
 className="h-8 px-4 text-label-xxs font-semibold uppercase text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-md group/btn transition-all"
 onClick={(e) => {
 e.stopPropagation();
 router.push(`/stocktake/${row.original.id}`);
 }}
 >
 {tc('view') || 'Inspect'}
 <Plus className="w-3 h-3 ms-2 group-hover/btn:rotate-90 transition-transform" />
 </Button>
 </div>
 ),
 },
 ], [t, tc, locale, router]);

 const activeSessionsCount = data?.meta?.total || 0;
 const inProgressCount = data?.data?.filter(i => isPendingStatus('STOCKTAKE', i.status as DocumentStatus)).length || 0;
 const postedCount = data?.data?.filter(i => isPostedStatus('STOCKTAKE', i.status as DocumentStatus)).length || 0;

 return (
 <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
 <div className="flex flex-col gap-6">
 <Breadcrumb 
 items={[
 { label: tc('inventory'), href: '#' },
 { label: t('title'), href: `/stocktake` }
 ]} 
 />
 <PageHeader
 title={t('title')}
 description={t('description') || 'Physical inventory verification and variance auditing'} actions={
 <div className="flex items-center gap-8">
 <div className="flex flex-col items-end gap-1 border-e border-outline-low pe-8 hidden md:flex">
 <div className="text-label-xs font-semibold uppercase text-cyan-500 flex items-center gap-2">
 <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,1)]" />
 {tc('status.live_updates')}
 </div>
 <div dir="ltr" className="text-label-xxs font-bold text-muted-foreground/30 flex items-center gap-1.5">
 <History className="w-2.5 h-2.5" />
 {tc('status.last_sync')}: {new Date().toLocaleTimeString()}
 </div>
 </div>
 <PermissionGate action="create" resource="stocktake">
 <Link href={`/stocktake/new`}>
 <Button className="h-12 px-10 bg-cyan-600 hover:bg-cyan-500 text-white text-label-xs font-semibold uppercase rounded-md transition-all shadow-xl shadow-cyan-900/20 group">
 <Plus className="w-4 h-4 me-2 group-hover:rotate-90 transition-transform" />
 {t('create_new')}
 </Button>
 </Link>
 </PermissionGate>
 </div>
 }
 />
 </div>

 <QueryBoundary 
        isLoading={isLoading} 
        error={data === undefined && !isLoading ? new Error('Failed to load data') : null}
        loadingFallback={<PageSkeleton />}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            label={t('total_sessions')}
            value={activeSessionsCount}
            icon={FileText}
            trend="active"
          />
          <MetricCard
            label={t('in_progress')}
            value={inProgressCount}
            icon={AlertCircle}
            trend="active"
            color="amber"
          />
          <MetricCard
            label={t('posted')}
            value={postedCount}
            icon={ClipboardCheck}
            trend="active"
            color="emerald"
          />
        </div>

        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-6 w-full p-8 bg-surface-container-low rounded-lg border border-outline-low shadow-2xl">
            <div className="flex flex-col gap-3 min-w-[280px] flex-1">
              <div className="flex items-center gap-2 ms-1">
                <Filter className="w-3 h-3 text-cyan-500/60" />
                <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tc('status_label') || 'Filter by State'}</label>
              </div>
              <Select
                value={initialStatus || 'ALL'} 
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-full bg-surface-container-highest/20 border-outline-low h-12 px-5 text-label-sm font-semibold rounded-md focus:ring-cyan-500/20 hover:bg-surface-container-highest/40 transition-all">
                  <SelectValue placeholder={tc('status.all')} />
                </SelectTrigger>
                <SelectContent className="bg-surface-container-highest border-outline-low rounded-xl">
                  <SelectItem value="ALL" className="text-label-sm font-bold">{tc('status.all')}</SelectItem>
                  <SelectItem value="DRAFT" className="text-label-sm font-bold">{tc('status.draft')}</SelectItem>
                  <SelectItem value="STARTED" className="text-label-sm font-bold">{tc('status.started')}</SelectItem>
                  <SelectItem value="VARIANCE_SUBMITTED" className="text-label-sm font-bold">{tc('status.variance_submitted')}</SelectItem>
                  <SelectItem value="APPROVED" className="text-label-sm font-bold">{tc('status.approved')}</SelectItem>
                  <SelectItem value="POSTED" className="text-label-sm font-bold">{tc('status.posted')}</SelectItem>
                  <SelectItem value="REJECTED" className="text-label-sm font-bold">{tc('status.rejected')}</SelectItem>
                  <SelectItem value="CANCELLED" className="text-label-sm font-bold">{tc('status.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3 min-w-[340px] flex-[2]">
              <div className="flex items-center gap-2 ms-1">
                <Search className="w-3 h-3 text-cyan-500/60" />
                <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tc('search')}</label>
              </div>
              <div className="relative group">
                <input
                  placeholder={t('search_placeholder') || 'Search by Session ID...'} 
                  className="w-full bg-surface-container-highest/20 border border-outline-low h-12 px-6 text-label-sm font-semibold rounded-md outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all placeholder:text-muted-foreground/20 group-hover:bg-surface-container-highest/40"
                />
              </div>
            </div>

            <Button className="h-12 px-8 bg-surface-container-highest/40 hover:bg-surface-container-highest/60 text-foreground/60 text-label-xs font-semibold uppercase rounded-md transition-all border border-outline-low hover:text-foreground">
              {tc('filters_button')}
            </Button>
          </div>

          <div className="bg-surface-container-lowest rounded-lg border border-outline-low overflow-hidden shadow-2xl">
            <DataTable
              columns={columns}
              data={data?.data || []}
              isLoading={false}
              onRowClick={(row: StocktakeSummary) => router.push(`/stocktake/${row.id}`)}
              collectionName="operations_stocktake"
              enableVirtualization={true}
              containerHeight="600px"
              emptyState={
                <EmptyState 
                  title={t('no_records') || 'No Stocktakes Found'} 
                  description={t('description') || 'Physical inventory verification sessions will appear here.'} 
                  action={
                    <PermissionGate action="create" resource="stocktake">
                      <Button 
                        onClick={() => router.push(`/stocktake/new`)}
                        className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 border border-cyan-500/20"
                      >
                        <Plus className="w-4 h-4 me-2" />
                        {t('create_new')}
                      </Button>
                    </PermissionGate>
                  }
                />
              }
              pagination={data?.meta ? {
                page: data.meta.page,
                pageSize: data.meta.page_size,
                total: data.meta.total,
                totalPages: data.meta.total_pages,
                onPageChange: handlePageChange
              } : undefined}
            />
          </div>
        </div>
      </QueryBoundary>
 </div>
 );
}
