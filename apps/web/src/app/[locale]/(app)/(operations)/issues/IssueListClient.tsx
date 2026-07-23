'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname, Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useIssueList, IssueSummary } from '@/features/operations/hooks/useIssueList';
import { useOperationalScope } from '@/hooks/useOperationalScope';
import { format } from 'date-fns';
import { useAuth } from '@/providers/AuthProvider';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Search, ArrowUpRight, Activity, FileText, ClipboardCheck, ChevronRight } from 'lucide-react';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

import { Input } from '@/components/ui/input';
import { isIssueDraft, isIssuePosted } from '@/domain/status-guards';
import { ISSUE_STATUS_UI, getStatusConfig } from '@/domain/status-ui-map';
import { ISSUE_STATUS } from '@logirest/shared-types';

export function IssueListClient({ initialStatus, initialPage }: { initialStatus?: string; initialPage: number }) {
    const t = useTranslations('operations.issue');
    const tc = useTranslations('common');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 400);

    const statusItems = React.useMemo(() => {
        const isAr = locale === 'ar';
        const list = [
            { id: 'ALL', name: isAr ? 'كل الحالات' : 'All Statuses' },
            { id: ISSUE_STATUS.DRAFT, name: isAr ? 'مسودة' : 'Draft' },
            { id: ISSUE_STATUS.SUBMITTED, name: isAr ? 'مقدم' : 'Submitted' },
            { id: ISSUE_STATUS.POSTED, name: isAr ? 'مرحّل' : 'Posted' },
            { id: ISSUE_STATUS.CANCELLED, name: isAr ? 'ملغى' : 'Cancelled' },
        ];
        return list.map(item => ({
            ...item,
            name_en: item.name,
            name_ar: item.name,
            nameEn: item.name,
            nameAr: item.name,
        }));
    }, [locale]);

    const { data, isLoading } = useIssueList({
        status: initialStatus,
        page: initialPage,
        search: debouncedSearch || undefined,
    });

    const handleExportAll = async (): Promise<Record<string, unknown>[]> => {
        try {
            const params = new URLSearchParams();
            params.set('page', '1');
            params.set('limit', '10000');
            if (initialStatus) params.set('status', initialStatus);
            if (debouncedSearch) params.set('search', debouncedSearch);

            const res = await apiClient.get(`/operations/issues?${params.toString()}`, paginatedSchema(z.object({
                documentNumber: z.string(),
                status: z.string(),
                warehouseName: z.string().optional().nullable(),
                destinationDepartmentName: z.string().optional().nullable(),
                departmentName: z.string().optional().nullable(),
                createdAt: z.string().optional().nullable(),
            })));

            const mapIssueRows = (rows: unknown[]) => rows.map(iss => {
                const itemObj = iss as Record<string, unknown>;
                let dateStr = '—';
                try {
                    if (itemObj.createdAt) dateStr = format(new Date(String(itemObj.createdAt)), 'yyyy-MM-dd HH:mm');
                } catch {
                    dateStr = String(itemObj.createdAt || '—');
                }

                return {
                    documentNumber: itemObj.documentNumber || '—',
                    destinationDepartmentName: itemObj.destinationDepartmentName || itemObj.departmentName || '—',
                    warehouseName: itemObj.warehouseName || '—',
                    createdAt: dateStr,
                    status: itemObj.status || '—',
                };
            });

            return mapIssueRows((res?.data ?? data?.data ?? []) as unknown[]);
        } catch {
            return ((data?.data ?? []) as unknown[]).map(iss => {
                const itemObj = iss as Record<string, unknown>;
                let dateStr = '—';
                try {
                    if (itemObj.createdAt) dateStr = format(new Date(String(itemObj.createdAt)), 'yyyy-MM-dd HH:mm');
                } catch {
                    dateStr = String(itemObj.createdAt || '—');
                }

                return {
                    documentNumber: itemObj.documentNumber || '—',
                    destinationDepartmentName: itemObj.destinationDepartmentName || itemObj.departmentName || '—',
                    warehouseName: itemObj.warehouseName || '—',
                    createdAt: dateStr,
                    status: itemObj.status || '—',
                };
            });
        }
    };

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
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6 w-full">
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
                <div className="hidden sm:flex bg-card border border-border shadow-sm p-6 flex-col gap-2 transition-all hover:bg-card border border-border shadow-sm/50 justify-center rounded-2xl ambient-shadow hover:scale-[1.01] duration-200">
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

            {/* Responsive Action Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full mb-6">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
                    <div className="w-full sm:w-[260px] relative group">
                        <div className="absolute inset-y-0 start-4 flex items-center pointer-events-none transition-colors group-focus-within:text-foreground text-muted-foreground/40">
                            <Search className="w-4 h-4" />
                        </div>
                        <Input
                            placeholder={t('search_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-card border border-border/50 h-11 ps-12 pe-4 text-label-xs font-semibold rounded-xl shadow-sm focus-visible:ring-1 focus-visible:ring-cyan-500/30 transition-all"
                        />
                    </div>

                    <SmartCombobox
                        items={statusItems}
                        value={initialStatus || 'ALL'}
                        onSelect={(item) => handleStatusChange(item.id)}
                        placeholder={tc('statuses.all') || "All Statuses"}
                        triggerClassName="w-full sm:w-[160px] bg-card border border-border/50 h-11 px-4 text-label-xs font-semibold uppercase rounded-xl shadow-sm focus:ring-1 focus:ring-cyan-500/30 whitespace-nowrap"
                    />
                </div>

                <div className="flex items-center justify-end shrink-0 gap-3 w-full sm:w-auto">
                    <PermissionGate action="export" resource="issue">
                        <ExportMenu
                            data={data?.data || []}
                            columns={exportColumns}
                            filename="operations_issues"
                            title="Stock Issues Report"
                            isCompactMobile={true}
                            onExportAll={handleExportAll}
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
                    enableVirtualization={true}
                    onRowClick={(row: IssueSummary) => router.push(`/issues/${row.id}`)}
                    collectionName="operations_issues"

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
                    renderMobileCard={(item: any) => (
                        <div
                            onClick={() => router.push(`/issues/${item.id}`)}
                            className="flex flex-row items-center justify-between gap-3 p-4 bg-surface-container-highest/40 border border-brand-gold/50 rounded-xl hover:bg-surface-container-highest/20 transition-colors cursor-pointer"
                        >
                            <div className="flex-1 flex flex-col gap-2 min-w-0">
                                <div className="flex items-center justify-between w-full gap-2">
                                    <span className="font-semibold text-foreground truncate font-mono text-sm">
                                        {item.documentNumber}
                                    </span>
                                    <StatusBadge status={item.status} />
                                </div>
                                {item.warehouseName && (
                                    <div className="text-muted-foreground text-xs truncate">
                                        {item.warehouseName}
                                    </div>
                                )}
                                <div className="flex items-center justify-between w-full text-xs gap-2">
                                    <span className="text-muted-foreground dark:text-slate-300 truncate max-w-[50%]">
                                        {item.destinationDepartmentName || '—'}
                                    </span>
                                    {item.createdAt && (
                                        <span className="text-muted-foreground font-mono flex-shrink-0">
                                            <ClientOnlyTime
                                                date={item.createdAt}
                                                mode="datetime"
                                                locale={locale as 'ar' | 'en'}
                                                className="tabular-nums"
                                            />
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex-shrink-0 text-brand-gold bg-brand-gold/10 p-1.5 rounded-lg border border-brand-gold">
                                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                            </div>
                        </div>
                    )}
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
