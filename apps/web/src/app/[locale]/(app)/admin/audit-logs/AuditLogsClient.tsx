'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useAuditLogs, type AuditLogRow } from '@/features/admin/hooks/useAuditLogs';
import { AuditDiffViewer } from '@/components/shared/AuditDiffViewer';
import { format } from 'date-fns';
import { generateExcel } from '@/utils/export';
import { ChevronDown, History, Download, ShieldAlert, Activity, Database } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/ui/metric-card';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';

const actionColors: Record<string, string> = {
 CREATE: 'bg-muted/50 text-foreground border-emerald-500/20',
 UPDATE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
 DELETE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
 POST: 'bg-muted/50 text-foreground border-cyan-500/20',
 APPROVE: 'bg-muted/50 text-foreground border-blue-500/20',
};

export function AuditLogsClient() {
 const t = useTranslations('admin');
 const tc = useTranslations('common');
 const locale = useLocale() as 'ar' | 'en';
 const [page, setPage] = useState(1);
 const [expandedId, setExpandedId] = useState<string | null>(null);
 const { data, isLoading } = useAuditLogs({ page });

 const stats = useMemo(() => {
 return {
 total: data?.meta?.total || 0,
 securityEvents: data?.data?.filter(e => ['DELETE', 'APPROVE'].includes(e.action)).length || 0,
 systemActivity: t('audit_logs.nominal')
 };
 }, [data, t]);

 const handleExport = () => {
 if (!data?.data) return;
 generateExcel(
 [
 { header: t('entity_type'), key: 'type', width: 15 },
 { header: t('entity_id'), key: 'id', width: 20 },
 { header: t('action'), key: 'action', width: 15 },
 { header: t('user_name'), key: 'user', width: 20 },
 { header: t('created_at'), key: 'date', width: 20 },
 ],
 data.data.map((entry) => ({
 type: entry.entityType,
 id: entry.entityId,
 action: entry.action,
 user: entry.userName,
 date: format(new Date(entry.createdAt), 'yyyy-MM-dd HH:mm'),
 })),
 tc('actions.audit_log_filename')
 );
 };

 const columns = useMemo((): ColumnDef<AuditLogRow, unknown>[] => [
 {
 accessorKey: 'entityType',
 header: t('entity_type'),
 cell: ({ row }) => (
 <span className="font-mono text-label-xs font-semibold px-2 py-0.5 rounded-sm bg-surface-container-highest/50 text-muted-foreground border border-white/5 uppercase">
 {row.original.entityType}
 </span>
 ),
 },
 {
 accessorKey: 'entityId',
 header: t('entity_id'),
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono text-label-xs text-foreground font-bold">
 {row.original.entityId}
 </span>
 ),
 },
 {
 accessorKey: 'action',
 header: t('action'),
 cell: ({ row }) => (
 <span className={`px-2 py-0.5 text-label-xxs font-semibold rounded-sm border uppercase ${actionColors[row.original.action] ?? 'bg-surface-container-highest/20 text-muted-foreground border-white/5'}`}>
 {row.original.action}
 </span>
 ),
 },
 {
 accessorKey: 'userName',
 header: t('user_name'),
 cell: ({ row }) => <span className="text-label-sm font-bold">{row.original.userName}</span>,
 },
 {
 accessorKey: 'createdAt',
 header: t('created_at'),
 cell: ({ row }) => (
 <ClientOnlyTime 
 date={row.original.createdAt} 
 mode="datetime" 
 showSeconds={true}
 locale={locale}
 className="text-label-xs font-medium text-muted-foreground/60 tabular-nums"
 />
 ),
 },
 {
 id: 'expand',
 header: '',
 cell: ({ row }) => (
 <div className="flex justify-end">
<Button
 variant="ghost"
 size="sm"
 aria-label={`${tc('view')} ${t('changes')}`}
 className={`h-7 px-2 transition-all ${expandedId === row.original.id ? 'bg-muted/50 text-foreground' : 'text-muted-foreground/40 hover:text-foreground hover:bg-muted/50'}`}
 onClick={(e: React.MouseEvent) => { 
 e.stopPropagation(); 
 setExpandedId(expandedId === row.original.id ? null : row.original.id); 
 }}
 >
 <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-500 ${expandedId === row.original.id ? 'rotate-180' : ''}`} />
 </Button>
 </div>
 ),
 },
 ], [t, tc, locale, expandedId]);

 return (
 <div className="min-w-0 max-w-[1600px] flex-1 fade-in gap-6 duration-1000 slide-in-from-bottom-4 mx-auto animate-in flex-col flex space-y-10 w-full">
 <PageHeader 
 title={t('audit_logs.title')} subtitle={t('audit_logs.client_description')}
 children={
 <PermissionGate action="export" resource="admin_audit_logs">
 <Button 
 onClick={handleExport}
 className="h-11 px-8 bg-surface-container-high hover:bg-surface-container-highest text-white text-label-xs font-semibold uppercase rounded-sm transition-all border border-white/5"
 >
 <Download className="w-3.5 h-3.5 me-2" />
 {t('export')}
 </Button>
 </PermissionGate>
 }
 />

 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 <MetricCard
 label={t('audit_logs.total_ledger_entries')}
 value={stats.total}
 icon={Database}
 color="cyan"
 />
 <MetricCard
 label={t('audit_logs.security_events')}
 value={stats.securityEvents}
 icon={ShieldAlert}
 color="rose"
 />
 <MetricCard
 label={t('audit_logs.integrity_status')}
 value={stats.systemActivity}
 icon={Activity}
 color="emerald"
 />
 </div>

 <DataTable
 columns={columns}
 data={data?.data ?? []}
 isLoading={isLoading}
 collectionName="admin_audit_logs"
 emptyState={
 <EmptyState
 title={t('audit_logs.no_ledger_entries')}
 description={t('audit_logs.no_ledger_entries_desc')}
 icon={History}
 />
 }
 pagination={data?.meta ? {
 page: data.meta.page,
 pageSize: data.meta.pageSize,
 total: data.meta.total,
 totalPages: data.meta.totalPages,
 onPageChange: setPage
 } : undefined}
 />

 {expandedId && data?.data && (() => {
 const entry = data.data.find((e) => e.id === expandedId);
 if (!entry) return null;
 return (
 <div className="p-8 rounded-sm border border-white/5 bg-card border border-border shadow-sm animate-in slide-in-from-top-4 duration-500 shadow-2xl">
 <div className="flex items-center gap-3 mb-6 text-foreground font-semibold text-label-xs uppercase">
 <History className="w-4 h-4" />
 {t('changes')}
 </div>
 <div className="rounded-sm overflow-hidden border border-white/10 bg-black/40">
 <AuditDiffViewer changes={entry.changes} />
 </div>
 </div>
 );
 })()}
 </div>
 );
}
