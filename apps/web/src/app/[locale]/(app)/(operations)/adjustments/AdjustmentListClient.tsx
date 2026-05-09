'use client';
 
import { useState, useMemo } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useAdjustmentList, AdjustmentSummary } from '@/features/operations/hooks/useAdjustmentList';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2, Clock, Activity, FileCheck, AlertTriangle, Filter } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
<<<<<<< HEAD:src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx
import { isPendingStatus, isPostedStatus, type DocumentStatus } from '@/core/workflow/document-engine';
=======
import { isAdjustmentPending, isAdjustmentPosted } from '@/domain/status-guards';
import { ADJUSTMENT_STATUS_UI } from '@/domain/status-ui-map';
import { ADJUSTMENT_STATUS } from '@/contracts/statuses';
>>>>>>> 002-frontend-baseline:apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx
 
// Reason → Semantic visual styling (Hardened for Culinary Architect)
const REASON_CHIP: Record<string, string> = {
 DAMAGE: 'bg-status-error/10 text-status-error font-bold border border-status-error/5',
 EXPIRY: 'bg-status-warning/10 text-status-warning font-bold border border-status-warning/5',
 THEFT: 'bg-status-error/10 text-status-error font-bold border border-status-error/5',
 COUNTING_ERROR:'bg-status-secondary/10 text-status-secondary font-bold border border-status-secondary/5',
 OTHER: 'bg-surface-container-highest/30 text-muted-foreground font-bold border border-outline-low/5',
};
 
 
export function AdjustmentListClient() {
 const t = useTranslations('operations.adjustment');
 const tCommon = useTranslations('common');
 const router = useRouter();
 
 const [page, setPage] = useState(1);
 const [status, setStatus] = useState<string>('');
 
 const { data, isLoading } = useAdjustmentList({ status, page });
 
 const columns = useMemo<ColumnDef<AdjustmentSummary>[]>(() => [
 {
 accessorKey: 'status',
 header: tCommon('status_label'),
 cell: ({ row }) => (
 <StatusBadge status={row.original.status} />
 ),
 },
 {
 accessorKey: 'document_number',
 header: t('doc_number'),
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono text-status-active text-body-md font-semibold">
 {row.original.document_number}
 </span>
 ),
 },
 {
 accessorKey: 'reason',
 header: t('reason'),
 cell: ({ row }) => {
 const reason = row.original.reason.toLowerCase();
 const cls = REASON_CHIP[row.original.reason as keyof typeof REASON_CHIP] ?? REASON_CHIP.OTHER;
 const label = t.has(`reasons.${reason}`) ? t(`reasons.${reason}`) : row.original.reason;
 return (
 <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-label-xxs uppercase ${cls}`}>
 {label}
 </span>
 );
 },
 },
 {
 accessorKey: 'warehouse_id',
 header: tCommon('warehouse'),
 cell: ({ row }) => <span className="opacity-80 font-medium">{tCommon('warehouses.' + row.original.warehouse_id.toLowerCase())}</span>,
 },
 {
 accessorKey: 'approved_by',
 header: t('approved_by'),
 cell: ({ row }) =>
 row.original.approved_by ? (
 <span className="inline-flex items-center gap-1.5 text-label-xs font-bold text-status-success">
 <CheckCircle2 className="w-3.5 h-3.5" />
 {row.original.approved_by}
 </span>
 ) : (
 <span className="inline-flex items-center gap-1.5 text-label-xs font-bold text-muted-foreground/30 italic">
 <Clock className="w-3.5 h-3.5" />
 {tCommon('status.pending') || 'Pending'}
 </span>
 ),
 },
 {
 accessorKey: 'created_at',
 header: tCommon('created_at'),
 cell: ({ row }) =>
 row.original.created_at ? (
 <span dir="ltr" className="text-label-xs text-muted-foreground/40 font-mono font-medium">
 {format(new Date(row.original.created_at), 'dd/MM/yyyy')}
 </span>
 ) : <span className="opacity-20 text-label-xs">—</span>,
 },
 {
 id: 'actions',
 header: '',
 cell: ({ row }) => (
 <div className="flex justify-end">
 <Button 
 variant="ghost" 
 size="sm" 
 className="text-label-xs font-bold uppercase text-status-active hover:bg-status-active/10 h-8 px-4 rounded-md"
 onClick={(e) => {
 e.stopPropagation();
 router.push(`/adjustments/${row.original.id}`);
 }}
 >
 {tCommon('view')}
 </Button>
 </div>
 ),
 },
 ], [t, tCommon, router]);
 
<<<<<<< HEAD:src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx
 const totalAdjustments = data?.meta?.total || 0;
 const inProgressCount = data?.data?.filter(i => isPendingStatus('ADJUSTMENT', i.status as DocumentStatus)).length || 0;
 const postedCount = data?.data?.filter(i => isPostedStatus('ADJUSTMENT', i.status as DocumentStatus)).length || 0;
 const majorAdjustmentsCount = data?.data?.filter(a => a.reason === 'DAMAGE' || a.reason === 'THEFT').length || 0;
 const pendingApprovalsCount = inProgressCount;
=======
  const totalAdjustments = data?.meta?.total || 0;
  const inProgressCount = data?.data?.filter(i => isAdjustmentPending(i.status)).length || 0;
  const postedCount = data?.data?.filter(i => isAdjustmentPosted(i.status)).length || 0;
  const majorAdjustmentsCount = data?.data?.filter(a => a.reason === 'DAMAGE' || a.reason === 'THEFT').length || 0;
  const pendingApprovalsCount = inProgressCount;
>>>>>>> 002-frontend-baseline:apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx
 
 return (
 <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
 <Breadcrumb 
 items={[
 { label: tCommon('inventory'), href: '#' },
 { label: t('title'), href: '/adjustments' }
 ]} 
 />
 <PageHeader 
 title={t('title')} 
 description={t('description') || 'Corrective inventory volume adjustments and audits'} actions={
 <div className="flex items-center gap-6">
 <div className="flex flex-col items-end gap-1 border-e border-outline-low pe-6 hidden md:flex">
 <div className="text-label-xs font-semibold uppercase text-muted-foreground/60 flex items-center gap-2">
 <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
 {tCommon('status.live_updates') || 'Correction Pulse'}
 </div>
 <div dir="ltr" className="text-label-xxs font-bold text-muted-foreground/40">
 {tCommon('status.last_sync') || 'Last Sync'}: {new Date().toLocaleTimeString()}
 </div>
 </div>
 <PermissionGate action="create" resource="adjustment">
 <Link href="/adjustments/new">
 <Button className="h-10 px-8 bg-surface-container-low border border-outline-low/10 text-status-active text-label-xs font-bold uppercase rounded-md transition-all hover:bg-surface-container-medium shadow-sm gap-2">
 <Plus className="w-3.5 h-3.5" />
 {t('create_new')}
 </Button>
 </Link>
 </PermissionGate>
 </div>
 }
 />
 
 {/* Summary Cards - Operational Nocturne Standard */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <MetricCard
 label={t('correction_volume')}
 value={totalAdjustments}
 icon={Activity}
 trend="active"
 />
 <MetricCard
 label={t('pending_approval')}
 value={pendingApprovalsCount}
 icon={FileCheck}
 trend="active"
 color="amber"
 />
 <MetricCard
 label={t('critical_losses')}
 value={majorAdjustmentsCount}
 icon={AlertTriangle}
 trend="active"
 color="rose"
 />
 </div>
 
 <DataTable 
 columns={columns}
 data={data?.data || []}
 isLoading={isLoading}
 onRowClick={(row: AdjustmentSummary) => router.push(`/adjustments/${row.id}`)}
 collectionName="operations_adjustments"
 emptyState={
 <EmptyState 
 title={t('no_records') || 'No Adjustments Found'} description={t('description') || 'Register your first inventory adjustment to recalibrate stock levels.'} action={
 <PermissionGate action="create" resource="adjustment">
 <Button 
 onClick={() => router.push('/adjustments/new')}
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
 page: page,
 pageSize: 10,
 total: data.meta.total,
 totalPages: data.meta.total_pages,
 onPageChange: setPage
 } : undefined}
 filters={
 <div className="flex flex-wrap items-center gap-6 w-full py-6 px-8 bg-surface-container-low border border-outline-low/5 rounded-lg">
 <div className="flex flex-col gap-2.5 min-w-[240px] flex-1">
 <label className="text-label-xs font-bold uppercase text-muted-foreground/40 ms-1">{tCommon('status_label')}</label>
 <Select
 value={status || 'ALL'} onValueChange={(val: string | null) => { 
 const nextStatus = val === 'ALL' || !val ? '' : val;
 setStatus(nextStatus); 
 setPage(1); 
 }}
 >
 <SelectTrigger className="w-full bg-surface-container-highest/20 border border-outline-low/10 h-12 px-5 text-label-xs font-bold uppercase rounded-md transition-all hover:bg-surface-container-highest/30 focus:ring-1 focus:ring-status-active/20">
 <SelectValue placeholder={tCommon('status.all')} />
 </SelectTrigger>
              <SelectContent className="bg-surface-container-high border-outline-low/10 rounded-xl shadow-2xl">
                <SelectItem value="ALL" className="text-label-xs font-bold uppercase">{tCommon('status.all')}</SelectItem>
                {Object.entries(ADJUSTMENT_STATUS_UI).filter(([key]) => Object.values(ADJUSTMENT_STATUS).includes(key as any)).map(([key, config]) => (
                  <SelectItem key={key} value={key} className="text-label-xs font-bold uppercase">
                    {tCommon(config.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
 </Select>
 </div>
 
 <div className="flex flex-col gap-2.5 min-w-[300px] flex-[2]">
 <label className="text-label-xs font-bold uppercase text-muted-foreground/40 ms-1">{tCommon('search')}</label>
 <div className="relative group">
 <Input
 placeholder={t('search_placeholder') || 'Search Adjustment Documents...'} className="w-full bg-surface-container-highest/20 border border-outline-low/10 h-12 ps-12 pe-4 text-label-xs font-bold rounded-md transition-all group-hover:bg-surface-container-highest/30 focus:ring-1 focus:ring-status-active/20 placeholder:text-muted-foreground/20"
 />
 <svg className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-status-active/40 transition-colors group-hover:text-status-active/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
 </div>
 </div>
 
 <Button className="h-12 px-8 bg-surface-container-highest/30 hover:bg-surface-container-highest/50 text-foreground text-label-xs font-bold uppercase rounded-md transition-all border border-outline-low/10 group">
 <Filter className="w-3.5 h-3.5 me-2 transition-transform group-hover:rotate-180 text-status-active/60" />
 {tCommon('filters_button')}
 </Button>
 </div>
 }
 />
 </div>
 );
}
