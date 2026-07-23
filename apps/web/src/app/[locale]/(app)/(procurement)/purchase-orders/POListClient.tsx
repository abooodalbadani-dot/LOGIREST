'use client';

import { useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { VirtualizedMobileGrid } from '@/components/shared/VirtualizedMobileGrid';
import { ColumnDef } from '@tanstack/react-table';
import { usePOList, POSummary } from '@/features/purchasing/hooks/usePOList';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { Plus, ClipboardList, CheckCircle2, Clock, ArrowUpRight, Search, AlertTriangle, Trash2, X } from 'lucide-react';
import { useDeletePO } from '@/features/purchasing/hooks/useDeletePO';

import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';
import { format } from 'date-fns';

import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { PageHeader } from '@/components/shared/PageHeader';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { ExportMenu } from '@/components/shared/ExportMenu';

import { type DocumentStatus, isApprovedStatus, isPendingStatus } from '@logirest/shared-types';
import { PO_STATUS } from '@logirest/shared-types';
import { formatCurrency } from '@/utils/currency';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { BadgeStatus } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';

export function POListClient({ locale }: { locale: 'ar' | 'en' }) {
  const t = useTranslations('procurement.po');
  const tc = useTranslations('common');
  const router = useRouter();
  const deletePO = useDeletePO();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [supplierId] = useState<string>('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = usePOList({ status, supplierId, search: debouncedSearch, page });

  const handleExportAll = async (): Promise<Record<string, unknown>[]> => {
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '10000');
      if (status) params.set('status', status);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await apiClient.get(`/procurement/purchase-orders?${params.toString()}`, paginatedSchema(z.object({
        documentNumber: z.string().optional(),
        poNumber: z.string().optional(),
        status: z.string().optional(),
        supplierName: z.string().optional().nullable(),
        totalAmount: z.number().optional().nullable(),
        createdAt: z.string().optional().nullable(),
      })));

      const mapPORows = (rows: unknown[]) => rows.map(p => {
        const itemObj = p as Record<string, unknown>;
        let dateStr = '—';
        try {
          if (itemObj.createdAt) dateStr = format(new Date(String(itemObj.createdAt)), 'yyyy-MM-dd HH:mm');
        } catch {
          dateStr = String(itemObj.createdAt || '—');
        }

        return {
          orderNumber: itemObj.documentNumber || itemObj.poNumber || '—',
          supplierName: itemObj.supplierName || '—',
          status: itemObj.status || '—',
          totalAmount: typeof itemObj.totalAmount === 'number' ? itemObj.totalAmount.toFixed(2) : (itemObj.totalAmount ? String(itemObj.totalAmount) : '—'),
          createdAt: dateStr,
        };
      });

      return mapPORows((res?.data ?? data?.data ?? []) as unknown[]);
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
          orderNumber: itemObj.documentNumber || itemObj.poNumber || '—',
          supplierName: itemObj.supplierName || '—',
          status: itemObj.status || '—',
          totalAmount: typeof itemObj.totalAmount === 'number' ? itemObj.totalAmount.toFixed(2) : (itemObj.totalAmount ? String(itemObj.totalAmount) : '—'),
          createdAt: dateStr,
        };
      });
    }
  };

  const statusItems = useMemo(() => [
    { id: 'ALL', name_en: tc('statuses.all'), name_ar: tc('statuses.all') },
    { id: PO_STATUS.DRAFT, name_en: tc('statuses.draft'), name_ar: tc('statuses.draft') },
    { id: PO_STATUS.SUBMITTED, name_en: tc('statuses.submitted'), name_ar: tc('statuses.submitted') },
    { id: PO_STATUS.APPROVED, name_en: tc('statuses.approved'), name_ar: tc('statuses.approved') },
    { id: PO_STATUS.REJECTED, name_en: tc('statuses.rejected'), name_ar: tc('statuses.rejected') },
  ], [tc]);

  const columns = useMemo<ColumnDef<POSummary, unknown>[]>(() => [
    {
      accessorKey: 'status',
      header: tc('status_label'),
      cell: ({ row }) => <StatusBadge status={row.original.status as BadgeStatus} />,
    },
    {
      accessorKey: 'documentNumber',
      header: tc('doc_number'),
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-brand-gold font-bold drop-shadow-[0_0_8px_rgba(196,162,118,0.4)]">
          {row.original.documentNumber}
        </span>
      ),
    },
    {
      accessorKey: 'supplierName',
      header: t('supplier'),
      cell: ({ row }) => (
        <div className="flex flex-col text-start min-w-0">
          <span className="opacity-90 font-bold text-body-md">
            {row.original.supplierName || '—'}
          </span>
          <span className="text-label-xxs uppercase text-muted-foreground/60 font-semibold">{t('supplier')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'expectedDate',
      header: t('expected_date'),
      cell: ({ row }) => {
        const isOverdue = row.original.expectedDate && new Date(row.original.expectedDate) < new Date() && row.original.status !== 'FULFILLED';
        return (
          <div className="min-w-0 gap-6 flex-1 text-start flex-col flex w-full">
            <div className="flex items-center gap-2">
              <ClientOnlyTime
                date={row.original.expectedDate}
                mode="date"
                locale={locale}
                fallback="--/--/----"
                className={isOverdue ? "text-label-xs font-mono font-bold text-status-error animate-pulse" : "text-label-xs font-mono font-semibold text-foreground/80"}
              />
              {isOverdue && (
                <span className="text-label-xxs font-bold uppercase text-status-error bg-status-error/10 px-1.5 py-0.5 rounded-sm animate-pulse">
                  <AlertTriangle className="w-3 h-3 inline me-0.5" />
                  Overdue
                </span>
              )}
            </div>
            <span className="text-label-xxs uppercase opacity-30 font-semibold">{t('expected_date')}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'supplierTotalAmount',
      header: t('total_amount'),
      cell: ({ row }) => (
        <div className="flex flex-col text-end min-w-0">
          <span dir="ltr" className="text-body-md font-mono font-semibold text-foreground/90">
            {formatCurrency(row.original.supplierTotalAmount, row.original.currencyCode, locale)}
          </span>
          <span className="text-label-xxs uppercase text-muted-foreground/60 font-semibold">{t('total_amount')}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const isDraft = row.original.status === 'DRAFT';
        return (
          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <PermissionGate action="view" resource="po">
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-xl bg-surface-variant/10 hover:bg-brand-gold/20 text-muted-foreground/60 hover:text-brand-gold transition-all group"
                onClick={() => {
                  router.push(`/purchase-orders/${row.original.id}`);
                }}
              >
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100" />
              </Button>
            </PermissionGate>

            {isDraft && (
              <PermissionGate action="delete" resource="po">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={deletePO.isPending}
                  className="w-8 h-8 rounded-xl bg-red-500/5 hover:bg-red-500/20 text-red-500 transition-all"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const confirmed = window.confirm('Are you sure you want to delete this draft purchase order?');
                    if (!confirmed) return;
                    try {
                      await deletePO.mutateAsync({ id: row.original.id });
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
  ], [t, tc, locale, router]);

  const breadcrumbs = [
    { label: tc('sidebar.dashboard'), href: '/dashboard' },
    { label: t('title'), href: '/purchase-orders' },
  ];

  const totalPOs = data?.meta?.total || 0;

  // Metrics calculation (Note: calculated from current page data.data)
  const approvedCount = data?.data?.filter(p => isApprovedStatus('PO', p.status as DocumentStatus)).length || 0;
  const pendingCount = data?.data?.filter(p => isPendingStatus('PO', p.status as DocumentStatus)).length || 0;

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="space-y-4">
        <Breadcrumb items={breadcrumbs} />
        <PageHeader
          title="PURCHASE"
          highlight="ORDERS"
          subtitle="Manage operational purchase orders..."
          children={
            <PermissionGate action="create" resource="po">
              <Link href="/purchase-orders/new" className="shrink-0 w-full sm:w-auto">
                <Button className="h-14 px-10 bg-brand-gold hover:bg-brand-gold-hover text-white text-label-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-brand-gold/30 border-none">
                  <Plus className="w-5 h-5 me-3" />
                  {t('create_new')}
                </Button>
              </Link>
            </PermissionGate>
          }
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-6">
        <MetricCard
          label={t('metrics.total')}
          value={totalPOs}
          icon={ClipboardList}
          color="amber"
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
          color="cyan"
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
            <PermissionGate action="export" resource="po">
              <div className="flex items-center gap-2 shrink-0">
                <ExportMenu
                  data={data.data as unknown as Record<string, unknown>[]}
                  columns={[
                    { header: t('order_number') || 'PO #', key: 'orderNumber' },
                    { header: t('supplier') || 'Supplier', key: 'supplierName' },
                    { header: tc('status_label') || 'Status', key: 'status' },
                    { header: t('total_amount') || 'Total Amount', key: 'totalAmount' },
                    { header: tc('created_at') || 'Date', key: 'createdAt' },
                  ]}
                  filename="purchase_orders"
                  title={t('title')}
                  onExportAll={handleExportAll}
                />
              </div>
            </PermissionGate>
          )}
        </div>

        {/* Desktop Version */}
        <div className="hidden lg:block">
          <DataTable
            columns={columns}
            data={data?.data || []}
            isLoading={isLoading}
            enableVirtualization={true}
            onRowClick={(row: POSummary) => router.push(`/purchase-orders/${row.id}`)}
            collectionName="procurement_po"
            emptyState={
              <EmptyState
                variant="minimal"
                title={tc('datatable.no_records')}
                action={
                  <PermissionGate action="create" resource="po">
                    <Link href="/purchase-orders/new" className="shrink-0 w-full sm:w-auto">
                      <Button className="h-10 px-6 bg-amber-600 hover:bg-amber-500 text-white text-label-xs font-semibold uppercase rounded-sm transition-all shadow-sm">
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

        {/* Mobile Version */}
        <div className="block lg:hidden flex flex-col gap-6 w-full min-w-0">

          {/* Cards or Empty/Loading State */}
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-[#1A2234] border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-sm animate-pulse space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
                    <div className="flex gap-2">
                      <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-16" />
                      <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-20" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                    </div>
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
                    <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="py-12 px-4">
              <EmptyState
                variant="minimal"
                title={tc('datatable.no_records')}
                action={
                  <PermissionGate action="create" resource="po">
                    <Link href="/purchase-orders/new" className="shrink-0 w-full sm:w-auto">
                      <Button className="h-10 px-6 bg-brand-gold hover:bg-brand-gold-hover text-white text-label-xs font-semibold uppercase rounded-sm transition-all shadow-sm">
                        <Plus className="w-3.5 h-3.5 me-2" />
                        {t('create_new')}
                      </Button>
                    </Link>
                  </PermissionGate>
                }
              />
            </div>
          ) : (
            <div className="space-y-6">
              <VirtualizedMobileGrid
                data={data.data}
                estimateSize={160}
                maxHeight={600}
                className="mt-4"
                renderCard={(po) => {
                  const isOverdue = po.expectedDate && new Date(po.expectedDate) < new Date() && po.status !== 'FULFILLED';
                  const isDraft = po.status === 'DRAFT';
                  return (
                    <div
                      key={po.id}
                      className="bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 rounded-lg p-3 flex flex-col gap-2 shadow-sm hover:border-gray-300 dark:hover:border-gray-700 transition-all cursor-pointer"
                      onClick={() => router.push(`/purchase-orders/${po.id}`)}
                    >
                      {/* TOP TIER: Identity */}
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[11px] font-mono font-bold text-[#b48e67] uppercase">
                              {po.documentNumber}
                            </span>
                            <StatusBadge status={po.status as BadgeStatus} className="px-1.5 py-0.5 text-[9px] rounded-md h-auto shrink-0" />
                          </div>
                          <span className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">
                            {po.supplierName || '—'}
                          </span>
                        </div>
                      </div>

                      {/* MIDDLE TIER: Meta (Expected Date & Total Amount) */}
                      <div className="grid grid-cols-2 gap-2 items-center mt-1 p-2 bg-gray-50 dark:bg-black/20 rounded-md">
                        <div className="flex flex-col text-start">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                            {t('expected_date')}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span dir="ltr" className="font-mono text-xs font-bold text-foreground">
                              <ClientOnlyTime
                                date={po.expectedDate}
                                mode="date"
                                locale={locale}
                                fallback="--/--/----"
                                className={cn(
                                  "font-mono font-bold",
                                  isOverdue ? "text-status-error font-bold animate-pulse" : "text-foreground"
                                )}
                              />
                            </span>
                            {isOverdue && (
                              <span className="text-[9px] font-bold uppercase text-status-error bg-status-error/10 px-1 py-0.5 rounded animate-pulse inline-flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Overdue
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col text-end items-end">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                            {t('total_amount')}
                          </span>
                          <span className="font-mono text-xs font-bold text-foreground">
                            {formatCurrency(po.supplierTotalAmount, po.currencyCode, locale)}
                          </span>
                        </div>
                      </div>

                      {/* BOTTOM TIER: Actions & Creation Date */}
                      <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-100 dark:border-gray-800/50">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                          <ClientOnlyTime
                            date={po.createdAt}
                            mode="date"
                            locale={locale}
                            fallback="--/--/----"
                            className="font-mono font-medium"
                          />
                        </div>

                        <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {isDraft && (
                            <PermissionGate action="delete" resource="po">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deletePO.isPending}
                                className="h-8 px-2.5 rounded-md text-xs font-bold text-status-error bg-status-error/10 hover:bg-status-error/20"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const confirmed = window.confirm('Are you sure you want to delete this draft purchase order?');
                                  if (!confirmed) return;
                                  try {
                                    await deletePO.mutateAsync({ id: po.id });
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </PermissionGate>
                          )}

                          <PermissionGate action="view" resource="po">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 rounded-md text-xs font-bold text-brand-gold bg-brand-gold/10 hover:bg-brand-gold/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/purchase-orders/${po.id}`);
                              }}
                            >
                              {tc('view')}
                            </Button>
                          </PermissionGate>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              {/* Pagination */}
              {data?.meta && (
                <div className="flex items-center justify-between mt-6 px-2">
                  <div className={cn("text-label-xs font-bold text-muted-foreground uppercase opacity-70 whitespace-nowrap")}>
                    {tc('datatable.showing') || 'Showing'}{' '}
                    <span dir="ltr">{(page - 1) * 10 + 1}</span>{' '}
                    {tc('datatable.to') || 'to'}{' '}
                    <span dir="ltr">{Math.min(page * 10, data.meta.total)}</span>{' '}
                    {tc('datatable.of') || 'of'}{' '}
                    <span dir="ltr">{data.meta.total}</span>
                  </div>
                  <Pagination
                    page={page}
                    totalPages={data.meta.totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
