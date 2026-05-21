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
    return list.map((w: { id: string; name_en: string; name_ar: string; code?: string }) => ({
      id: w.id,
      name_en: w.name_en,
      name_ar: w.name_ar,
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
      accessorKey: 'document_number',
      header: () => <span className="text-label-xs font-semibold uppercase opacity-40">{t('doc_number')}</span>,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span dir="ltr" className="font-mono text-body-md font-semibold text-cyan-500">
            {row.original.document_number}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground/20 uppercase tracking-tight">
            {t('internal_voucher')}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'destination_department_id',
      header: () => <span className="text-label-xs font-semibold uppercase opacity-40">{t('destination')}</span>,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-surface-container-highest/50">
            <Activity className="w-3 h-3 text-muted-foreground/40" />
          </div>
          <span className="text-label-xs font-semibold text-muted-foreground/60">
            {row.original.destination_dept_id || '—'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: () => <span className="text-label-xs font-semibold uppercase opacity-40">{tc('created_at')}</span>,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ClientOnlyTime
            date={row.original.created_at}
            mode="date"
            className="text-label-xs font-mono font-medium text-muted-foreground/60 tabular-nums"
          />
          <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
          <ClientOnlyTime
            date={row.original.created_at}
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
            className="group/btn h-9 w-9 rounded-md bg-surface-container-highest/30 hover:bg-cyan-500 hover:text-white transition-all duration-300"
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

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <div className="flex items-center gap-4">
            <PermissionGate action="create" resource="issue">
              <Link href={`/issues/new`}>
                <Button className="h-10 px-6 rounded-md bg-surface-container-low border border-outline-low/5 text-label-xs font-semibold uppercase gap-2 group transition-all hover:bg-surface-container-medium shadow-sm whitespace-nowrap">
                  <Plus className="w-3.5 h-3.5 me-2" />
                  {t('create_new')}
                </Button>
              </Link>
            </PermissionGate>
          </div>
        }
      />

      {/* Fulfillment Status Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          label={t('throughput_volume')}
          value={totalItemsCount}
          icon={Activity}
          trend="active"
        />
        <MetricCard
          label={t('pending_selection')}
          value={draftCount}
          icon={FileText}
          trend="active"
          color="amber"
        />
        <MetricCard
          label={t('finalized_issues')}
          value={postedCount}
          icon={ClipboardCheck}
          trend="active"
          color="emerald"
        />
        <div className="bg-surface-container-lowest p-6 flex flex-col gap-2 transition-all hover:bg-surface-container-low/50 justify-center rounded-2xl ambient-shadow hover:scale-[1.01] duration-200">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2 rtl:space-x-reverse">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-7 h-7 rounded-full bg-surface-container-highest border-2 border-surface-container-low flex items-center justify-center text-label-xxs font-semibold text-muted-foreground/40">
                  OP
                </div>
              ))}
            </div>
            <div className="text-label-xxs font-semibold text-muted-foreground/40 leading-tight whitespace-nowrap">
              <span className="text-foreground">{t('operators_count', { count: 3 })}</span> {t('operators_active')} • {t('fulfillment_stream')}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filter Substrate */}
      <div className="bg-surface-container-low/50 p-6 rounded-xl border border-outline-low/10 ambient-shadow backdrop-blur-sm">
        <div className="flex items-center justify-between gap-6 overflow-x-auto no-scrollbar">
          <div className="flex-1 min-w-[300px] relative group">
            <div className="absolute inset-y-0 start-5 flex items-center pointer-events-none transition-colors group-focus-within:text-cyan-500 text-muted-foreground/30">
              <Search className="w-4 h-4" />
            </div>
            <Input
              placeholder={t('search_placeholder')}
              className="w-full bg-surface-container-high/50 border-none h-14 ps-14 pe-6 text-label-xs font-semibold rounded-md shadow-inner shadow-black/5 focus-visible:ring-2 focus-visible:ring-cyan-500/10 transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="w-px h-10 bg-surface-container-high/50 mx-2" />
            <div className="flex items-center gap-2">
              <SmartCombobox
                items={statusItems}
                value={initialStatus || 'ALL'}
                onSelect={(item) => handleStatusChange(item.id)}
                placeholder={tc('statuses.all') || "All Statuses"}
                triggerClassName="w-[180px] bg-surface-container-high/50 border-none h-14 px-6 text-label-xs font-semibold uppercase rounded-md shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/10 whitespace-nowrap"
              />

              <SmartCombobox
                items={warehouseItems}
                value={isWarehouseLocked ? (warehouseId || '') : warehouseFilter}
                onSelect={(item) => { if (!isWarehouseLocked) { setWarehouseFilter(item.id as string); } }}
                placeholder={tFilters('warehouse')}
                disabled={isWarehouseLocked}
                triggerClassName="w-[200px] bg-surface-container-high/50 border-none h-14 px-6 text-label-xs font-semibold rounded-md shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/10 whitespace-nowrap"
              />

              <Button variant="outline" className="h-14 px-6 bg-surface-container-high/50 hover:bg-surface-container-high border-none rounded-md shadow-inner shadow-black/5">
                <Filter className="w-4 h-4 text-muted-foreground/60" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-surface-container-high/50 p-1.5 rounded-md shadow-inner shadow-black/5">
            <Button size="icon" variant="ghost" className="w-11 h-11 rounded-md text-cyan-500 bg-surface-container-low shadow-sm">
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="w-11 h-11 rounded-md text-muted-foreground/20">
              <ListIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Consumption Ledger */}
      <div className="bg-surface-container-lowest rounded-lg border border-outline-low/5 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          onRowClick={(row: IssueSummary) => router.push(`/issues/${row.id}`)}
          collectionName="operations_issues"
          enableVirtualization={true}
          containerHeight="600px"
          emptyState={
            <EmptyState
              variant="minimal"
              title={t('no_records')}
              description={t('description')}
              action={
                <PermissionGate action="create" resource="issue">
                  <Button
                    onClick={() => router.push(`/issues/new`)}
                    className="h-11 px-8 rounded-md bg-operational-cyan hover:bg-operational-cyan/90 text-white shadow-lg shadow-cyan-500/20 border-none transition-all active:scale-95"
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
            pageSize: meta.page_size,
            total: meta.total,
            totalPages: meta.total_pages,
            onPageChange: handlePageChange
          } : undefined}
        />
      </div>
    </div>
  );
}
