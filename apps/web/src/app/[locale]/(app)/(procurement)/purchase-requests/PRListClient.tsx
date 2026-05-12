'use client';

import { useState, useMemo } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { usePRList, PRSummary } from '@/features/purchasing/hooks/usePRList';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { Plus, Filter, ClipboardList, CheckCircle2, Clock, ArrowUpRight, ListFilter, Search } from 'lucide-react';

import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';

import { PageHeader } from '@/components/shared/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { DocumentStatus, isApprovedStatus, isPendingStatus } from '@/core/workflow/document-engine';
import { PR_STATUS } from '@/contracts/statuses';

export function PRListClient() {
 const locale = useLocale();
 const t = useTranslations('procurement.pr');
 const tc = useTranslations('common');
 const router = useRouter();

 const [page, setPage] = useState(1);
 const [status, setStatus] = useState<string>('');

 const { data, isLoading } = usePRList({ status, page });

 const columns = useMemo<ColumnDef<PRSummary, unknown>[]>(() => [
 {
 accessorKey: 'status',
 header: tc('status_label'),
 cell: ({ row }) => <StatusBadge status={row.original.status as BadgeStatus} />,
 },
 {
 accessorKey: 'document_number',
 header: tc('doc_number'),
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono text-cyan-500 font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
 {row.original.document_number}
 </span>
 ),
 },
 {
 accessorKey: 'warehouse_id',
 header: tc('warehouse'),
 cell: ({ row }) => (
 <div className="flex flex-col">
 <span className="opacity-90 font-bold text-body-md text-start">{row.original.warehouse_id}</span>
 <span className="text-label-xxs uppercase text-muted-foreground/60 font-semibold text-start">{tc('warehouse')}</span>
 </div>
 ),
 },
 {
 accessorKey: 'created_at',
 header: tc('created_at'),
 cell: ({ row }) => (
 <div className="flex flex-col">
 <span dir="ltr" className="text-label-xs font-mono font-semibold text-foreground/80">
 <ClientOnlyTime date={row.original.created_at} mode="datetime" />
 </span>
 <span className="text-label-xxs uppercase opacity-30 font-semibold text-start">{tc('created_at')}</span>
 </div>
 ),
 },
 {
 accessorKey: 'created_by',
 header: t('requested_by'),
 cell: ({ row }) => (
 <div className="flex flex-col">
 <span className="opacity-90 font-bold text-body-md text-start">{row.original.created_by}</span>
 <span className="text-label-xxs uppercase text-muted-foreground/60 font-semibold text-start">{t('requested_by')}</span>
 </div>
 ),
 },
 {
 id: 'actions',
 header: '',
 cell: ({ row }) => (
 <div className="flex justify-end">
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
 </div>
 ),
 },
 ], [t, tc, locale, router]);

 const breadcrumbs = [
  { label: tc('sidebar.dashboard'), href: '/dashboard' },
  { label: t('title'), href: '/purchase-requests' },
 ];

  const totalPRs = data?.meta?.total || 0;
  
  // Metrics calculation (Note: calculated from current page data.data)
  const approvedCount = data?.data?.filter(p => isApprovedStatus('PR', p.status as DocumentStatus)).length || 0;
  const pendingCount = data?.data?.filter(p => isPendingStatus('PR', p.status as DocumentStatus)).length || 0;

 return (
 <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
 <div className="space-y-4">
 <Breadcrumb items={breadcrumbs} />
 <PageHeader 
 title={t('title')} 
 description={t('description')}
 actions={
 <PermissionGate action="create" resource="pr">
  <Link href="/purchase-requests/new">
              <Button className="h-14 px-10 bg-operational-cyan hover:brightness-110 text-white text-label-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-operational-cyan/30 border-none">
                <Plus className="w-5 h-5 me-3" />
                {t('create_new')}
              </Button>
 </Link>
 </PermissionGate>
 }
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

 <div className="bg-surface-container-low rounded-sm overflow-hidden border border-surface-variant/10 shadow-2xl shadow-primary/5">
 <DataTable 
 columns={columns}
 data={data?.data || []}
 isLoading={isLoading}
  onRowClick={(row: PRSummary) => router.push(`/purchase-requests/${row.id}`)}
 collectionName="procurement_pr"
 emptyState={
 <EmptyState 
 variant="minimal"
 title={tc('datatable.no_records')} action={
 <PermissionGate action="create" resource="pr">
  <Link href="/purchase-requests/new">
 <Button className="h-10 px-6 bg-operational-cyan hover:bg-operational-cyan/90 text-white text-label-xs font-semibold uppercase rounded-xl transition-all shadow-lg shadow-operational-cyan/20">
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
 totalPages: data.meta.total_pages,
 onPageChange: setPage
 } : undefined}
 filters={
 <div className="flex flex-wrap items-center gap-6 w-full py-6 px-8 border-b border-surface-variant/10">
 <div className="flex flex-col gap-2 min-w-[200px]">
 <label className="text-label-xxs font-semibold uppercase text-muted-foreground/60 ps-1">{tc('status_filtering')}</label>
 <Select
 value={status || 'ALL'} onValueChange={(val) => { setStatus(val === 'ALL' ? '' : (val ?? '')); setPage(1); }}
 >
 <SelectTrigger className="w-full bg-surface-variant/10 border-none h-11 px-5 text-label-xs font-bold rounded-sm shadow-inner shadow-black/5">
 <div className="flex items-center gap-2">
 <ListFilter className="w-3.5 h-3.5 text-muted-foreground/60" />
 <SelectValue placeholder={tc('statuses.all')} />
 </div>
 </SelectTrigger>
                <SelectContent className="bg-surface-container-highest border border-surface-variant/10 shadow-2xl rounded-sm">
                  <SelectItem value="ALL" className="text-label-xs font-bold">{tc('statuses.all')}</SelectItem>
                  <SelectItem value={PR_STATUS.DRAFT} className="text-label-xs font-bold">{tc('status.draft')}</SelectItem>
                  <SelectItem value={PR_STATUS.SUBMITTED} className="text-label-xs font-bold">{tc('status.submitted')}</SelectItem>
                  <SelectItem value={PR_STATUS.APPROVED} className="text-label-xs font-bold">{tc('status.approved')}</SelectItem>
                  <SelectItem value={PR_STATUS.REJECTED} className="text-label-xs font-bold">{tc('status.rejected')}</SelectItem>
                </SelectContent>
 </Select>
 </div>

 <div className="flex flex-col gap-2 flex-1 min-w-[300px]">
 <label className="text-label-xxs font-semibold uppercase text-muted-foreground/60 ps-1">{tc('search')}</label>
 <div className="relative group">
 <Input
 placeholder={t('search_placeholder')}
 className="w-full bg-surface-variant/10 border-none h-11 px-11 text-label-xs font-bold rounded-sm shadow-inner shadow-black/5 transition-all focus:bg-surface-container-high"
 />
 <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-cyan-500 transition-colors" />
 </div>
 </div>

 <Button variant="ghost" className="h-11 px-6 text-muted-foreground/60 hover:text-cyan-500 text-label-xxs font-semibold uppercase border border-dashed border-surface-variant/10 rounded-sm hover:bg-cyan-500/5 hover:border-cyan-500/20 transition-all mt-6">
 <Filter className="w-3.5 h-3.5 me-2" />
 {tc('filters_button')}
 </Button>
 </div>
 }
 />
 </div>
 </div>
 );
}
