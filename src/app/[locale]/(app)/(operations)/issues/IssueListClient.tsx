'use client';
 
import * as React from 'react';
import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname, Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useIssueList, IssueSummary } from '@/features/operations/hooks/useIssueList';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Filter, Search, ArrowUpRight, LayoutGrid, List as ListIcon, Activity, FileText, ClipboardCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
 
export function IssueListClient({ initialStatus, initialPage }: { initialStatus?: string; initialPage: number }) {
 const t = useTranslations('operations.issue');
 const tc = useTranslations('common');
 const locale = useLocale() as 'ar' | 'en';
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();
 
 const { data, isLoading } = useIssueList({
 status: initialStatus,
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
 <div className="flex flex-col">
 <span dir="ltr" className="font-mono text-body-md font-semibold text-cyan-500">
 {row.original.document_number}
 </span>
 <span className="text-label-xxs font-semibold text-muted-foreground/40 uppercase">
 Internal Voucher
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
 <Activity className="w-3 h-3 text-muted-foreground/60" />
 </div>
 <span className="text-label-xs font-semibold text-muted-foreground/40">
 {row.original.destination_department_id || '—'}
 </span>
 </div>
 ),
 },
 {
 accessorKey: 'created_at',
 header: () => <span className="text-label-xs font-semibold uppercase opacity-40">{tc('created_at')}</span>,
 cell: ({ row }) => (
 <div className="flex flex-col items-start gap-0.5">
 <span dir="ltr" className="text-label-xs font-mono font-medium text-muted-foreground/60 tabular-nums">
 {format(new Date(row.original.created_at), 'dd/MM/yyyy')}
 </span>
 <span className="text-label-xxs font-semibold text-muted-foreground/20 uppercase">
 {format(new Date(row.original.created_at), 'HH:mm')}
 </span>
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
 
 const meta = data?.meta?.pagination;
 const totalItemsCount = meta?.total || 0;
 const draftCount = data?.data?.filter(i => i.status === 'DRAFT').length || 0;
 const postedCount = data?.data?.filter(i => i.status === 'POSTED').length || 0;
 
 return (
 <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
 
 <PageHeader 
 title={t('title')} 
 description={t('description')} actions={
 <div className="flex items-center gap-4">
 <PermissionGate action="create" resource="issue">
 <Link href="/issues/new">
 <Button className="h-10 px-6 rounded-md bg-surface-container-low border border-outline-low/5 text-label-xs font-semibold uppercase gap-2 group transition-all hover:bg-surface-container-medium shadow-sm">
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
 label="Throughput Volume"
 value={totalItemsCount}
 icon={Activity}
 trend="active"
 />
 <MetricCard
 label="Pending Selection"
 value={draftCount}
 icon={FileText}
 trend="active"
 color="amber"
 />
 <MetricCard
 label="Finalized Issues"
 value={postedCount}
 icon={ClipboardCheck}
 trend="active"
 color="emerald"
 />
 <div className="bg-surface-container-low p-6 flex flex-col gap-2 transition-colors hover:bg-surface-container-lowest justify-center border border-outline-low/5 rounded-lg shadow-sm">
 <div className="flex items-center gap-3">
 <div className="flex -space-x-2 rtl:space-x-reverse">
 {[1,2,3].map(i => (
 <div key={i} className="w-7 h-7 rounded-full bg-surface-container-highest border-2 border-surface-container-low flex items-center justify-center text-label-xxs font-semibold text-muted-foreground/60">
 OP
 </div>
 ))}
 </div>
 <div className="text-label-xxs font-semibold text-muted-foreground/60 leading-tight">
 <span className="text-foreground">3 Operators</span> active<br/>in fulfillment stream
 </div>
 </div>
 </div>
 </div>
 
 {/* Advanced Filter Substrate */}
 <div className="bg-surface-container-low p-6 rounded-lg border border-outline-low/5 shadow-sm">
 <div className="flex flex-wrap items-center gap-6">
 <div className="flex-1 min-w-[300px] relative group">
 <div className="absolute inset-y-0 start-5 flex items-center pointer-events-none transition-colors group-focus-within:text-cyan-500 text-muted-foreground/40">
 <Search className="w-4 h-4" />
 </div>
 <Input
 placeholder={t('search_placeholder')} className="w-full bg-surface-container-high/50 border-none h-14 ps-14 pe-6 text-label-xs font-semibold rounded-md shadow-inner shadow-black/5 focus-visible:ring-2 focus-visible:ring-cyan-500/10 transition-all"
 />
 </div>
 
 <div className="flex items-center gap-4">
 <div className="w-px h-10 bg-surface-container-high/50 mx-2" />
 <div className="flex items-center gap-2">
 <Select
 value={initialStatus || 'ALL'} onValueChange={handleStatusChange}
 >
 <SelectTrigger className="w-[180px] bg-surface-container-high/50 border-none h-14 px-6 text-label-xs font-semibold uppercase rounded-md shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/10">
 <SelectValue placeholder={tc('status.all')} />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-highest border border-outline-low/10 shadow-2xl rounded-md overflow-hidden">
 <SelectItem value="ALL" className="text-label-xs font-semibold uppercase">{tc('status.all')}</SelectItem>
 <SelectItem value="DRAFT" className="text-label-xs font-semibold uppercase">{tc('status.draft')}</SelectItem>
 <SelectItem value="APPROVED" className="text-label-xs font-semibold uppercase">{tc('status.approved')}</SelectItem>
 <SelectItem value="POSTED" className="text-label-xs font-semibold uppercase">{tc('status.posted')}</SelectItem>
 <SelectItem value="CANCELLED" className="text-label-xs font-semibold uppercase">{tc('status.rejected')}</SelectItem>
 </SelectContent>
 </Select>
 
 <Button variant="outline" className="h-14 px-6 bg-surface-container-high/50 hover:bg-surface-container-high border-none rounded-md shadow-inner shadow-black/5">
 <Filter className="w-4 h-4 text-muted-foreground/60" />
 </Button>
 </div>
 </div>
 
 <div className="flex items-center gap-1 bg-surface-container-high/50 p-1.5 rounded-md shadow-inner shadow-black/5 ms-auto">
 <Button size="icon" variant="ghost" className="w-11 h-11 rounded-md text-cyan-500 bg-surface-container-low shadow-sm"><LayoutGrid className="w-4 h-4" /></Button>
 <Button size="icon" variant="ghost" className="w-11 h-11 rounded-md text-muted-foreground/40"><ListIcon className="w-4 h-4" /></Button>
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
 emptyState={
 <EmptyState 
 title={t('no_records')} description={t('description')} action={
 <PermissionGate action="create" resource="issue">
 <Button 
 onClick={() => router.push(`/issues/new`)}
 className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 border border-cyan-500/20"
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
 totalPages: meta.total_pages,
 onPageChange: handlePageChange
 } : undefined}
 />
 </div>
 </div>
 );
}
