'use client';

import { useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { VirtualizedMobileGrid } from '@/components/shared/VirtualizedMobileGrid';
import { ColumnDef } from '@tanstack/react-table';
import { usePRList, PRSummary } from '@/features/purchasing/hooks/usePRList';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { Plus, ClipboardList, CheckCircle2, Clock, ArrowUpRight, Search, Trash2, X, Building2, User } from 'lucide-react';
import { useDeletePR } from '@/features/purchasing/hooks/useDeletePR';

import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';
import { format } from 'date-fns';

import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';

import { PageHeader } from '@/components/shared/PageHeader';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { DocumentStatus, isApprovedStatus, isPendingStatus } from '@logirest/shared-types';
import { PR_STATUS } from '@logirest/shared-types';
import { ExportMenu } from '@/components/shared/ExportMenu';

export function PRListClient() {
  const locale = useLocale();
  const t = useTranslations('procurement.pr');
  const tc = useTranslations('common');
  const router = useRouter();
  const deletePR = useDeletePR();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = usePRList({ status, search: debouncedSearch, page });

  const handleExportAll = async (): Promise<Record<string, unknown>[]> => {
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '10000');
      if (status) params.set('status', status);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await apiClient.get(`/procurement/purchase-requests?${params.toString()}`, paginatedSchema(z.object({
        documentNumber: z.string().optional(),
        requestNumber: z.string().optional(),
        status: z.string().optional(),
        departmentName: z.string().optional().nullable(),
        createdAt: z.string().optional().nullable(),
      })));

      const mapPRRows = (rows: unknown[]) => rows.map(p => {
        const itemObj = p as Record<string, unknown>;
        let dateStr = '—';
        try {
          if (itemObj.createdAt) dateStr = format(new Date(String(itemObj.createdAt)), 'yyyy-MM-dd HH:mm');
        } catch {
          dateStr = String(itemObj.createdAt || '—');
        }

        return {
          requestNumber: itemObj.documentNumber || itemObj.requestNumber || '—',
          departmentName: itemObj.departmentName || '—',
          status: itemObj.status || '—',
          createdAt: dateStr,
        };
      });

      return mapPRRows((res?.data ?? data?.data ?? []) as unknown[]);
    } catch {
      return ((data?.data ?? []) as unknown[]).map(p => {
        const itemObj = p as Record<string, unknown>;
        let dateStr = '—';
        try {
          if (itemObj.createdAt) dateStr = format(new Date(String(itemObj.createdAt)), 'yyyy-MM-dd HH:mm');
        } catch {
          dateStr = String(itemObj.createdAt || '—');
        }

        return {
          requestNumber: itemObj.documentNumber || itemObj.requestNumber || '—',
          departmentName: itemObj.departmentName || '—',
          status: itemObj.status || '—',
          createdAt: dateStr,
        };
      });
    }
  };

  const statusItems = useMemo(() => [
    { id: 'ALL', name_en: tc('statuses.all'), name_ar: tc('statuses.all') },
    { id: PR_STATUS.DRAFT, name_en: tc('statuses.draft'), name_ar: tc('statuses.draft') },
    { id: PR_STATUS.SUBMITTED, name_en: tc('statuses.submitted'), name_ar: tc('statuses.submitted') },
    { id: PR_STATUS.APPROVED, name_en: tc('statuses.approved'), name_ar: tc('statuses.approved') },
    { id: PR_STATUS.REJECTED, name_en: tc('statuses.rejected'), name_ar: tc('statuses.rejected') },
  ], [tc]);

  const columns = useMemo<ColumnDef<PRSummary, unknown>[]>(() => [
    {
      accessorKey: 'status',
      header: tc('status_label'),
      cell: ({ row }) => <StatusBadge status={row.original.status as BadgeStatus} />,
    },
    {
      accessorKey: 'documentNumber',
      header: tc('doc_number'),
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-cyan-500 font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
          {row.original.documentNumber}
        </span>
      ),
    },
    {
      accessorKey: 'warehouseName',
      header: tc('warehouse'),
      cell: ({ row }) => (
        <span className="opacity-90 font-bold text-body-md text-start">{row.original.warehouseName || '—'}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: tc('created_at'),
      cell: ({ row }) => (
        <span dir="ltr" className="text-label-xs font-mono font-semibold text-foreground/80 text-start">
          <ClientOnlyTime date={row.original.createdAt} mode="datetime" />
        </span>
      ),
    },
    {
      accessorKey: 'createdBy',
      header: t('requested_by'),
      cell: ({ row }) => (
        <span className="opacity-90 font-bold text-body-md text-start">{row.original.createdBy}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const isDraft = row.original.status === 'DRAFT';
        return (
          <div className="gap-2 min-w-0 gap-6 flex-1 justify-end flex-col flex w-full" onClick={(e) => e.stopPropagation()}>
            <PermissionGate action="view" resource="pr">
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-xl bg-surface-variant/10 hover:bg-cyan-500/20 text-muted-foreground/60 hover:text-cyan-500 transition-all group"
                onClick={() => {
                  router.push(`/purchase-requests/${row.original.id}`);
                }}
              >
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100" />
              </Button>
            </PermissionGate>

            {isDraft && (
              <PermissionGate action="delete" resource="pr">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={deletePR.isPending}
                  className="w-8 h-8 rounded-xl bg-red-500/5 hover:bg-red-500/20 text-red-500 transition-all"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const confirmed = window.confirm('Are you sure you want to delete this draft request?');
                    if (!confirmed) return;
                    try {
                      await deletePR.mutateAsync({ id: row.original.id });
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </PermissionGate>
            )}
          </div>
        );
      }
    },
  ], [t, tc, locale, router, deletePR.isPending, deletePR]);

  const breadcrumbs = [
    { label: tc('sidebar.dashboard'), href: '/dashboard' },
    { label: t('title'), href: '/purchase-requests' },
  ];

  const totalPRs = data?.meta?.total || 0;

  // Metrics calculation (Note: calculated from current page data.data)
  const approvedCount = data?.data?.filter(p => isApprovedStatus('PR', p.status as DocumentStatus)).length || 0;
  const pendingCount = data?.data?.filter(p => isPendingStatus('PR', p.status as DocumentStatus)).length || 0;

  const pageTitle = t('title') || 'PURCHASE REQUESTS';
  const titleParts = pageTitle.split(' ');
  const titleFirst = titleParts[0];
  const titleHighlight = titleParts.length > 1 ? titleParts.slice(1).join(' ') : '';

  return (
    <div className="min-h-screen flex flex-col w-full max-w-full overflow-x-hidden gap-6 p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="space-y-4">
        <Breadcrumb items={breadcrumbs} />
        <PageHeader
          title={titleFirst}
          highlight={titleHighlight}
          subtitle={t('description')}
          children={
            <PermissionGate action="create" resource="pr">
              <Link href="/purchase-requests/new" className="shrink-0 w-full sm:w-auto">
                <Button className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5 me-3" />
                  {t('create_new')}
                </Button>
              </Link>
            </PermissionGate>
          }
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 w-full min-w-0">
        <MetricCard
          label={t('metrics.total')}
          value={totalPRs}
          icon={ClipboardList}
          color="cyan"
        />
        <MetricCard
          label={t('metrics.approved')}
          value={approvedCount}
          icon={CheckCircle2}
          color="emerald"
        />
        <MetricCard
          label={t('metrics.pending')}
          value={pendingCount}
          icon={Clock}
          color="amber"
        />
      </div>

      <div className="flex-1 w-full min-h-[400px] md:min-h-0">
        {/* Unified Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 w-full">
            <div className="w-full sm:w-64">
              <div className="relative w-full">
                <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={tc('search')}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full h-11 ps-10 bg-background border border-border text-foreground focus:border-brand-gold rounded-xl transition-all shadow-sm"
                />
              </div>
            </div>
            <div className="w-full sm:w-48 relative group">
              <SmartCombobox
                items={statusItems}
                value={status || 'ALL'}
                onSelect={(item) => { setStatus(item.id === 'ALL' ? '' : String(item.id)); setPage(1); }}
                placeholder={tc('statuses.all')}
                triggerClassName={status ? "h-11 bg-background border border-border shadow-sm pr-8 w-full" : "h-11 bg-background border border-border shadow-sm w-full"}
              />
              {status && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={(e) => { e.stopPropagation(); setStatus(''); setPage(1); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {data?.data && data.data.length > 0 && (
            <PermissionGate action="export" resource="pr">
              <div className="flex items-center gap-2 shrink-0">
                <ExportMenu
                  data={data.data as unknown as Record<string, unknown>[]}
                  columns={[
                    { header: t('doc_number') || 'Doc #', key: 'requestNumber' },
                    { header: t('department') || 'Department', key: 'departmentName' },
                    { header: tc('status_label') || 'Status', key: 'status' },
                    { header: tc('created_at') || 'Date', key: 'createdAt' },
                  ]}
                  filename="purchase_requests"
                  title={t('title')}
                  onExportAll={handleExportAll}
                />
              </div>
            </PermissionGate>
          )}

        </div>

        <div className="hidden md:block">
          <DataTable
            columns={columns}
            data={data?.data || []}
            isLoading={isLoading}
            enableVirtualization={true}
            onRowClick={(row: PRSummary) => router.push(`/purchase-requests/${row.id}`)}
            collectionName="procurement_pr"
            emptyState={
              <EmptyState
                variant="minimal"
                title={tc('datatable.no_records')} action={
                  <PermissionGate action="create" resource="pr">
                    <Link href="/purchase-requests/new" className="shrink-0 w-full sm:w-auto">
                      <Button className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                        <Plus className="w-3.5 h-3.5 me-2" />
                        {t('create_new')}
                      </Button>
                    </Link>
                  </PermissionGate>
                }
              />
            }
            pagination={data?.meta ? {
              page: page,
              pageSize: 10,
              total: data.meta.total,
              totalPages: data.meta.totalPages,
              onPageChange: setPage
            } : undefined}
          />
        </div>

        {!isLoading && data?.data && data.data.length > 0 && (
          <VirtualizedMobileGrid
            data={data.data}
            estimateSize={140}
            maxHeight={600}
            className="mt-4"
            renderCard={(pr) => (
              <div
                key={pr.id}
                onClick={() => router.push(`/purchase-requests/${pr.id}`)}
                className="bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex flex-col gap-3 transition-all hover:shadow-md cursor-pointer"
              >
                {/* TOP TIER: Document ID & Status */}
                <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-black text-[#0B1220] dark:text-white uppercase tracking-tight">{pr.documentNumber}</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest">{tc('doc_number')}</span>
                  </div>
                  <StatusBadge status={pr.status as BadgeStatus} />
                </div>

                {/* MID TIER: Audit Data */}
                <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-800/50">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>{pr.createdBy || 'مسؤول مشتريات'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400" dir="ltr">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span><ClientOnlyTime date={pr.createdAt} mode="datetime" /></span>
                  </div>
                </div>

                {/* BOTTOM TIER: Warehouse & Action */}
                <div className="flex justify-between items-end pt-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{tc('warehouse')}</span>
                    <span className="text-xs font-bold text-[#0B1220] dark:text-gray-200 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#b48e67]" />
                      {pr.warehouseName || '—'}
                    </span>
                  </div>

                  {/* Standardized Touch-Friendly Action Button */}
                  <button className="h-8 px-4 flex items-center justify-center bg-gray-50 dark:bg-[#0B1220] border border-gray-200 dark:border-gray-700 text-[#0B1220] dark:text-[#b48e67] rounded-md text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    {tc('view') || 'عرض'}
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
