'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname, Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useKitchenRequestList, KitchenRequestSummary } from '@/features/operations/hooks/useKitchenRequests';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { MetricCard } from '@/components/ui/metric-card';
import { ColumnDef } from '@tanstack/react-table';
import {
  FileText,
  Plus,
  Warehouse,
  Calendar,
  ChefHat,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  X
} from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { audioAlerts } from '@/utils/audio';

import { isPendingStatus, isApprovedStatus, isCompletedStatus, type DocumentStatus } from '@logirest/shared-types';
import { KITCHEN_REQUEST_STATUS } from '@logirest/shared-types';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

export function KitchenRequestsListClient({
  initialStatus,
  initialDepartmentId,
  initialPage,
  initialSearch,
  initialLimit,
  locale
}: {
  initialStatus?: string;
  initialDepartmentId?: string;
  initialPage: number;
  initialSearch: string;
  initialLimit: number;
  locale: 'ar' | 'en'
}) {
  const t = useTranslations('operations.kitchen_request');
  const tc = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchVal, setSearchVal] = useState(initialSearch);
  const [statusVal, setStatusVal] = useState(initialStatus || '');
  const debouncedSearch = useDebounce(searchVal, 400);

  const { data, isLoading } = useKitchenRequestList({
    status: statusVal,
    department_id: initialDepartmentId,
    page: initialPage,
    search: debouncedSearch,
    limit: initialLimit
  });

  // Sync to URL when filters change
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const params = new URLSearchParams(searchParams.toString());

    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }

    if (statusVal) {
      params.set('status', statusVal);
    } else {
      params.delete('status');
    }

    // Always reset to page 1 when filter changes
    params.set('page', '1');

    router.replace(`${pathname}?${params.toString()}`);
  }, [debouncedSearch, statusVal]);

  // Sync inputs with external URL changes
  useEffect(() => {
    setSearchVal(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setStatusVal(initialStatus || '');
  }, [initialStatus]);

  const statusItems = useMemo(() => [
    { id: 'ALL', name_en: tc('statuses.all'), name_ar: tc('statuses.all') },
    { id: KITCHEN_REQUEST_STATUS.DRAFT, name_en: tc('statuses.draft'), name_ar: tc('statuses.draft') },
    { id: KITCHEN_REQUEST_STATUS.SUBMITTED, name_en: tc('statuses.submitted'), name_ar: tc('statuses.submitted') },
    { id: KITCHEN_REQUEST_STATUS.APPROVED, name_en: tc('statuses.approved'), name_ar: tc('statuses.approved') },
    { id: KITCHEN_REQUEST_STATUS.CANCELLED, name_en: tc('statuses.cancelled'), name_ar: tc('statuses.cancelled') },
    { id: KITCHEN_REQUEST_STATUS.FULFILLED, name_en: tc('statuses.fulfilled'), name_ar: tc('statuses.fulfilled') },
  ], [tc]);

  const handleExportAll = async (): Promise<Record<string, unknown>[]> => {
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '10000');
      if (statusVal) params.set('status', statusVal);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await apiClient.get(`/operations/kitchen-requests?${params.toString()}`, paginatedSchema(z.object({
        documentNumber: z.string().optional(),
        requestNumber: z.string().optional(),
        status: z.string().optional(),
        departmentName: z.string().optional().nullable(),
        warehouseName: z.string().optional().nullable(),
        requestedBy: z.string().optional().nullable(),
        createdAt: z.string().optional().nullable(),
      })));

      const mapKRRows = (rows: unknown[]) => rows.map(kr => {
        const itemObj = kr as Record<string, unknown>;
        let dateStr = '—';
        try {
          if (itemObj.createdAt) dateStr = format(new Date(String(itemObj.createdAt)), 'yyyy-MM-dd HH:mm');
        } catch {
          dateStr = String(itemObj.createdAt || '—');
        }

        return {
          requestNumber: itemObj.documentNumber || itemObj.requestNumber || '—',
          departmentName: itemObj.departmentName || '—',
          warehouseName: itemObj.warehouseName || '—',
          requestedBy: itemObj.requestedBy || '—',
          status: itemObj.status || '—',
          createdAt: dateStr,
        };
      });

      return mapKRRows((res?.data ?? data?.data ?? []) as unknown[]);
    } catch {
      return ((data?.data ?? []) as unknown[]).map(kr => {
        const itemObj = kr as Record<string, unknown>;
        let dateStr = '—';
        try {
          if (itemObj.createdAt) dateStr = format(new Date(String(itemObj.createdAt)), 'yyyy-MM-dd HH:mm');
        } catch {
          dateStr = String(itemObj.createdAt || '—');
        }

        return {
          requestNumber: itemObj.documentNumber || itemObj.requestNumber || '—',
          departmentName: itemObj.departmentName || '—',
          warehouseName: itemObj.warehouseName || '—',
          requestedBy: itemObj.requestedBy || '—',
          status: itemObj.status || '—',
          createdAt: dateStr,
        };
      });
    }
  };

  const columns = useMemo<ColumnDef<KitchenRequestSummary>[]>(() => [
    {
      accessorKey: 'requestNumber',
      header: t('doc_number'),
      cell: ({ row }) => (
        <div className="flex flex-col min-w-0">
          <Link
            href={`/kitchen-requests/${row.original.id}`}
            className="font-mono text-body-md font-semibold text-foreground hover:text-foreground transition-colors"
          >
            {row.original.requestNumber}
          </Link>
          <div className="flex items-center gap-1.5 opacity-20 mt-1">
            <Calendar className="w-2.5 h-2.5" />
            <ClientOnlyTime
              date={row.original.createdAt}
              mode="datetime"
              locale={locale}
              className="text-label-xxs font-semibold tabular-nums"
            />
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'departmentName',
      header: t('department'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ChefHat className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="font-bold text-label-sm text-foreground/80">
            {row.original.departmentName || '—'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'warehouseName',
      header: t('warehouse'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Warehouse className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="font-bold text-label-sm text-foreground/80">
            {row.original.warehouseName || '—'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'requestedBy',
      header: t('requested_by'),
      cell: ({ row }) => (
        <span className="text-label-sm font-medium text-foreground/60">{row.original.requestedBy}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: t('status'),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ], [t, tc, locale]);

  const submittedCount = data?.data?.filter(doc => isPendingStatus('KITCHEN_REQUEST', doc.status as DocumentStatus)).length || 0;
  const approvedCount = data?.data?.filter(r => isApprovedStatus('KITCHEN_REQUEST', r.status)).length || 0;
  const completedCount = data?.data?.filter(doc => isCompletedStatus('KITCHEN_REQUEST', doc.status as DocumentStatus)).length || 0;
  const rejectedCount = data?.data?.filter(r => r.status === KITCHEN_REQUEST_STATUS.CANCELLED).length || 0;
  const fulfilledCount = data?.data?.filter(r => r.status === KITCHEN_REQUEST_STATUS.FULFILLED).length || 0;

  return (
    <div className="w-full min-w-0 gap-6 flex-1 flex-col flex">
      <Breadcrumb
        items={[
          { label: tc('home'), href: '/' },
          { label: tc('operations'), href: '/operations' },
          { label: t('title') },
        ]}
      />

      <PageHeader
        title={t('title')}
        subtitle={t('description')}
        children={
          <PermissionGate action="create" resource="kitchen_requests">
            <Link href="/kitchen-requests/new" className="shrink-0 w-full sm:w-auto">
              <Button className="h-14 px-10 bg-brand-gold hover:bg-brand-gold-hover text-white text-label-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-brand-gold/30 border-none">
                <Plus className="w-5 h-5 me-3" />
                {t('create_new')}
              </Button>
            </Link>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label={t('statuses.submitted')}
          value={submittedCount}
          icon={<Clock className="w-4 h-4" />}
          color="cyan"
        />
        <MetricCard
          label={t('statuses.approved')}
          value={approvedCount}
          icon={<CheckCircle2 className="w-4 h-4" />}
          color="emerald"
        />
        <MetricCard
          label={t('statuses.rejected')}
          value={rejectedCount}
          icon={<AlertCircle className="w-4 h-4" />}
          color="rose"
        />
        <MetricCard
          label={t('statuses.fulfilled')}
          value={fulfilledCount}
          icon={<FileText className="w-4 h-4" />}
          color="indigo"
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
                  placeholder={tc('search') || "Search..."}
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="w-full h-11 ps-10 bg-background border border-border text-foreground focus:border-brand-gold rounded-xl transition-all shadow-sm"
                />
              </div>
            </div>
            <div className="w-full sm:w-48 relative group">
              <SmartCombobox
                items={statusItems}
                value={statusVal || 'ALL'}
                onSelect={(item) => setStatusVal(item.id === 'ALL' ? '' : String(item.id))}
                placeholder={tc('statuses.all')}
                triggerClassName="h-11 bg-background border border-border shadow-sm w-full"
              />
            </div>
          </div>

          {data?.data && data.data.length > 0 && (
            <PermissionGate action="export" resource="kitchen_requests">
              <div className="flex items-center gap-2 shrink-0">
                <ExportMenu
                  data={data.data as unknown as Record<string, unknown>[]}
                  columns={[
                    { header: t('doc_number') || 'Doc #', key: 'requestNumber' },
                    { header: t('department') || 'Department', key: 'departmentName' },
                    { header: t('warehouse') || 'Warehouse', key: 'warehouseName' },
                    { header: t('requested_by') || 'Requested By', key: 'requestedBy' },
                    { header: tc('status_label') || 'Status', key: 'status' },
                    { header: tc('created_at') || 'Date', key: 'createdAt' },
                  ]}
                  filename="kitchen_requests"
                  title={t('title')}
                  onExportAll={handleExportAll}
                />
              </div>
            </PermissionGate>
          )}
        </div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          enableVirtualization={true}
          collectionName="kitchen_requests"
          exportTitle={t('title')}
          exportFilename="operational_requisitions"
          renderMobileCard={(item: KitchenRequestSummary) => (
            <div key={item.id} className="bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex flex-col gap-3 text-start">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
                <div><StatusBadge status={item.status} /></div>
                <span className="text-[10px] text-gray-500 font-mono" dir="ltr">
                  <ClientOnlyTime
                    date={item.createdAt}
                    mode="datetime"
                    locale={locale}
                    className="text-label-xxs font-semibold tabular-nums"
                  />
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-black text-[#0B1220] dark:text-white" dir="ltr">{item.requestNumber}</span>
                <Link
                  href={`/kitchen-requests/${item.id}`}
                  className="text-[#b48e67] hover:text-[#8a6b4c] text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  {locale === 'ar' ? 'عرض' : 'View'}
                  <svg className="w-3 h-3 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              <div className="bg-gray-50 dark:bg-[#0B1220] p-2 rounded-lg border border-gray-100 dark:border-gray-800 flex flex-col gap-1.5 mt-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[9px] text-gray-400 font-bold uppercase min-w-[50px]">{locale === 'ar' ? 'القسم' : 'DEPT'}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300 truncate">{item.departmentName || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs border-t border-gray-100 dark:border-gray-800 pt-1.5">
                  <span className="text-[9px] text-gray-400 font-bold uppercase min-w-[50px]">{locale === 'ar' ? 'المستودع' : 'WH'}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300 truncate">{item.warehouseName || '—'}</span>
                </div>
              </div>
            </div>
          )}

          pagination={{
            page: initialPage,
            pageSize: initialLimit,
            total: data?.meta?.total ?? 0,
            totalPages: data?.meta?.totalPages ?? 1,
            onPageChange: (page) => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('page', page.toString());
              router.push(`${pathname}?${params.toString()}`);
            },
            onPageSizeChange: (pageSize) => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('limit', pageSize.toString());
              params.set('page', '1');
              router.push(`${pathname}?${params.toString()}`);
            }
          }}
        />
      </div>
    </div>
  );
}
