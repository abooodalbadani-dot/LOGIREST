'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname, Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useIssueList, IssueSummary } from '@/features/operations/hooks/useIssueList';
import { useOperationalScope } from '@/hooks/useOperationalScope';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { useAuth } from '@/providers/AuthProvider';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Filter, Search, ArrowUpRight, LayoutGrid, List as ListIcon, Activity, FileText, ClipboardCheck } from 'lucide-react';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { ExportMenu } from '@/components/shared/ExportMenu';

import { Input } from '@/components/ui/input';
import { isIssueDraft, isIssuePosted } from '@/domain/status-guards';
import { ISSUE_STATUS_UI, getStatusConfig } from '@/domain/status-ui-map';
import { ISSUE_STATUS } from '@logirest/shared-types';

export function IssueListClient({ initialStatus, initialPage }: { initialStatus?: string; initialPage: number }) {
 const t = useTranslations('operations.issue');
 const tc = useTranslations('common');
 const tFilters = useTranslations('filters');
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();
 const { user } = useAuth();
 const { warehouseId } = useOperationalScope();
 const { data: warehousesData } = useWarehouses();

 const [warehouseFilter, setWarehouseFilter] = useState('');
 const isWarehouseLocked = user?.role === 'WH_KEEPER' || user?.role === 'STORE_MGR';
 const effectiveWarehouseId = isWarehouseLocked ? (warehouseId || '') : warehouseFilter;

 const warehouseItems = useMemo(() => {
  const list = warehousesData?.data ?? [];
  return list.map((w) => ({
   id: w.id,
   name_en: w.name || '',
   name_ar: w.name || '',
   code: w.code,
  }));
 }, [warehousesData]);

 const statusItems = React.useMemo(() => {
  const allItem = {
   id: 'ALL',
   name_en: tc('statuses.all') || 'All Statuses',
   name_ar: tc('statuses.all') || 'كل الحالات',
  };
  const statuses = Object.values(ISSUE_STATUS).map((value) => {
   const config = getStatusConfig(value, ISSUE_STATUS_UI);
   return {
    id: value,
    name_en: tc(config.labelKey) || value,
    name_ar: tc(config.labelKey) || value,
   };
  });
  return [allItem, ...statuses];
 }, [tc]);

 const { data, isLoading } = useIssueList({
  status: initialStatus,
  warehouse_id: effectiveWarehouseId || undefined,
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

 const columns = useMemo<ColumnDef<IssueSummary>[]>(() => [
  {
   accessorKey: 'status',
   header: () => <span className="text-label-xs font-semibold uppercase opacity-40">{tc('status_label')}</span>,
   cell: ({ row }) => (
    <div className="flex items-center gap-3">
     <div className="w-1 h-8 rounded-full bg-surface-container-highest/20" />
     <StatusBadge status={row.original.status} />
    </div>
   ),
  },
  {
   accessorKey: 'documentNumber',
   header: () => <span className="text-label-xs font-semibold uppercase opacity-40">{t('doc_number')}</span>,
   cell: ({ row }) => (
    <div className="flex items-center gap-2">
     <span dir="ltr" className="font-mono text-body-md font-semibold text-foreground">
      {row.original.documentNumber}
     </span>
     <span className="text-[10px] font-bold text-muted-foreground/20 uppercase tracking-tight">
      {t('internal_voucher')}
     </span>
    </div>
   ),
  },
  {
   accessorKey: 'destinationDepartmentName',
   header: () => <span className="text-label-xs font-semibold uppercase opacity-40">{t('destination')}</span>,
   cell: ({ row }) => (
    <div className="flex items-center gap-2">
     <div className="p-1.5 rounded-lg bg-surface-container-highest/50">
      <Activity className="w-3 h-3 text-muted-foreground/40" />
     </div>
     <span className="text-label-xs font-semibold text-muted-foreground/60">
      {row.original.destinationDepartmentName || '—'}
     </span>
    </div>
   ),
  },
  {
   accessorKey: 'warehouseName',
   header: () => <span className="text-label-xs font-semibold uppercase opacity-40">{tc('warehouse')}</span>,
   cell: ({ row }) => (
    <div className="flex items-center gap-2">
     <span className="text-label-xs font-semibold text-muted-foreground/60">
      {row.original.warehouseName || '—'}
     </span>
    </div>
   ),
  },
  {
   accessorKey: 'createdAt',
   header: () => <span className="text-label-xs font-semibold uppercase opacity-40">{tc('created_at')}</span>,
   cell: ({ row }) => (
    <div className="flex items-center gap-2">
     <ClientOnlyTime
      date={row.original.createdAt}
      mode="date"
      className="text-label-xs font-mono font-medium text-muted-foreground/60 tabular-nums"
     />
     <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
     <ClientOnlyTime
      date={row.original.createdAt}
      mode="time"
      className="text-label-xs font-mono font-medium text-muted-foreground/30 tabular-nums uppercase"
     />
    </div>
   ),
  },
  {
   id: 'actions',
   header: '',
   cell: ({ row }) => (
    <div className="flex justify-end pe-4">
     <Button
      variant="ghost"
      size="sm"
      className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      onClick={(e) => {
       e.stopPropagation();
       router.push(`/issues/${row.original.id}`);
      }}
     >
      <ArrowUpRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 rtl:group-hover/btn:-translate-x-0.5" />
     </Button>
    </div>
   ),
  },
 ], [t, tc, router]);

  const meta = data?.meta;
  const totalItemsCount = meta?.total || 0;
  const postedCount = data?.data?.filter(i => isIssuePosted(i.status)).length || 0;
  const draftCount = data?.data?.filter(i => isIssueDraft(i.status)).length || 0;

  const exportColumns = React.useMemo(() => [
   { header: t('doc_number') || 'Voucher #', key: 'documentNumber' },
   { header: t('destination') || 'Destination', key: 'destinationDepartmentName' },
   { header: tc('warehouse') || 'Warehouse', key: 'warehouseName' },
   { header: tc('created_at') || 'Date', key: 'createdAt' },
   { header: tc('status_label') || 'Status', key: 'status' }
  ], [t, tc]);

  return (
  <div className="min-w-0 max-w-[1600px] flex-1 fade-in space-y-8 gap-6 duration-1000 slide-in-from-bottom-4 mx-auto animate-in flex-col flex w-full">
   <PageHeader
    title="STOCK"
    highlight="ISSUES"
    subtitle={t('description')}
    children={
     <div className="flex items-center gap-4">
      <PermissionGate action="create" resource="issue">
       <Link href={`/issues/new`} className="shrink-0 w-full sm:w-auto">
        <Button className="h-10 px-6 rounded-md bg-card border border-border shadow-sm border border-outline-low/5 text-label-xs font-semibold uppercase gap-2 group transition-all hover:bg-surface-container-medium shadow-sm whitespace-nowrap">
         <Plus className="w-3.5 h-3.5 me-2" />
         {t('create_new')}
        </Button>
       </Link>
      </PermissionGate>
     </div>
    }
   />

   {/* Fulfillment Status Ribbon */}
   <div className="flex flex-row md:grid md:grid-cols-4 overflow-x-auto md:overflow-x-visible gap-4 md:gap-6 pb-4 md:pb-0 snap-x hide-scrollbar">
    <MetricCard
     label={t('throughput_volume')}
     value={totalItemsCount}
     icon={Activity}
     trend="active"
     className="min-w-[85vw] sm:min-w-[250px] snap-center flex-shrink-0 md:min-w-0"
    />
    <MetricCard
     label={t('pending_selection')}
     value={draftCount}
     icon={FileText}
     trend="active"
     color="amber"
     className="min-w-[85vw] sm:min-w-[250px] snap-center flex-shrink-0 md:min-w-0"
    />
    <MetricCard
     label={t('finalized_issues')}
     value={postedCount}
     icon={ClipboardCheck}
     trend="active"
     color="emerald"
     className="min-w-[85vw] sm:min-w-[250px] snap-center flex-shrink-0 md:min-w-0"
    />
    <div className="hidden sm:flex min-w-[250px] snap-center flex-shrink-0 md:min-w-0 bg-card border border-border shadow-sm p-6 flex-col gap-2 transition-all hover:bg-card border border-border shadow-sm/50 justify-center rounded-2xl ambient-shadow hover:scale-[1.01] duration-200">
     <div className="flex items-center gap-3">
      <div className="flex -space-x-2 rtl:space-x-reverse">
       {[1, 2, 3].map(i => (
        <div key={i} className="w-7 h-7 rounded-full bg-surface-container-highest border-2 border-surface-container-low flex items-center justify-center text-label-xxs font-semibold text-muted-foreground/40">
         OP
        </div>
       ))}
      </div>
      <div className="text-xs font-semibold text-muted-foreground/40 leading-tight whitespace-nowrap">
       <span className="text-foreground">{t('operators_count', { count: 3 })}</span> {t('operators_active')} • {t('fulfillment_stream')}
      </div>
     </div>
    </div>
   </div>

   {/* Unified Toolbar */}
   <div className="flex flex-col lg:flex-row items-center justify-between gap-4 w-full mb-6">
    <div className="flex flex-wrap items-center gap-3 flex-1 overflow-x-auto custom-scrollbar pb-2">
     <div className="flex-1 min-w-[200px] max-w-[300px] relative group">
      <div className="absolute inset-y-0 start-4 flex items-center pointer-events-none transition-colors group-focus-within:text-foreground text-muted-foreground/40">
       <Search className="w-4 h-4" />
      </div>
      <Input
       placeholder={t('search_placeholder')}
       className="w-full bg-card border border-border/50 h-11 ps-12 pe-4 text-label-xs font-semibold rounded-xl shadow-sm focus-visible:ring-1 focus-visible:ring-cyan-500/30 transition-all"
      />
     </div>
     
     <SmartCombobox
      items={statusItems}
      value={initialStatus || 'ALL'}
      onSelect={(item) => handleStatusChange(item.id)}
      placeholder={tc('statuses.all') || "All Statuses"}
      triggerClassName="w-[160px] bg-card border border-border/50 h-11 px-4 text-label-xs font-semibold uppercase rounded-xl shadow-sm focus:ring-1 focus:ring-cyan-500/30 whitespace-nowrap"
     />

     <SmartCombobox
      items={warehouseItems}
      value={isWarehouseLocked ? (warehouseId || '') : warehouseFilter}
      onSelect={(item) => { if (!isWarehouseLocked) { setWarehouseFilter(item.id as string); } }}
      placeholder={tFilters('warehouse')}
      disabled={isWarehouseLocked}
      triggerClassName="w-[180px] bg-card border border-border/50 h-11 px-4 text-label-xs font-semibold rounded-xl shadow-sm focus:ring-1 focus:ring-cyan-500/30 whitespace-nowrap"
     />

     <Button variant="outline" className="h-11 px-4 bg-card hover:bg-surface-container-low border border-border/50 rounded-xl shadow-sm">
      <Filter className="w-4 h-4 text-muted-foreground/60" />
     </Button>
    </div>

    <div className="flex items-center shrink-0 gap-3">
     <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-border/50">
      <Button size="icon" variant="ghost" className="w-9 h-9 rounded-lg text-foreground bg-card shadow-sm">
       <LayoutGrid className="w-4 h-4" />
      </Button>
      <Button size="icon" variant="ghost" className="w-9 h-9 rounded-lg text-muted-foreground/40 hover:text-foreground">
       <ListIcon className="w-4 h-4" />
      </Button>
     </div>
     <PermissionGate action="export" resource="issue">
      <ExportMenu
       data={data?.data || []}
       columns={exportColumns}
       filename="operations_issues"
       title="Stock Issues Report"
       isCompactMobile={true}
      />
     </PermissionGate>
    </div>
   </div>

   {/* Main Consumption Ledger */}
   <div className="flex-1 w-full min-h-[400px] md:min-h-0">
    <DataTable
     columns={columns}
     data={data?.data || []}
     isLoading={isLoading}
     onRowClick={(row: IssueSummary) => router.push(`/issues/${row.id}`)}
     collectionName="operations_issues"
     enableVirtualization={true}
     containerHeight="600px"
     enableExport={false}
     emptyState={
      <EmptyState
       variant="minimal"
       title={t('no_records')}
       description={t('description')}
       action={
        <PermissionGate action="create" resource="issue">
         <Button
          onClick={() => router.push(`/issues/new`)}
          className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
         >
          <Plus className="w-4 h-4 me-2" />
          {t('create_new')}
         </Button>
        </PermissionGate>
       }
      />
     }
     pagination={meta ? {
      page: meta.page,
      pageSize: meta.pageSize,
      total: meta.total,
      totalPages: meta.totalPages,
      onPageChange: handlePageChange
     } : undefined}
    />
   </div>
  </div>
 );
}
