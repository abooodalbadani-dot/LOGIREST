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

import { ExportMenu } from '@/components/shared/ExportMenu';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { AuditLogEntrySchema } from '@/types/notifications';

const actionColors: Record<string, string> = {
  CREATE: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  UPDATE: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  DELETE: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  POST: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  APPROVE: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
  LOGIN: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  LOGOUT: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
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

 const formatDateSafe = (dateVal: unknown): string => {
  if (!dateVal) return '';
  try {
    const d = typeof dateVal === 'string' || dateVal instanceof Date ? new Date(dateVal) : null;
    return d && !isNaN(d.getTime()) ? format(d, 'yyyy-MM-dd HH:mm') : String(dateVal);
  } catch {
    return String(dateVal);
  }
 };

 const handleExportAll = async (): Promise<Record<string, unknown>[]> => {
  try {
   const params = new URLSearchParams();
   params.set('page', '1');
   params.set('limit', '10000');
   const res = await apiClient.get(`/admin/audit-logs?${params.toString()}`, paginatedSchema(AuditLogEntrySchema));
   const allLogs = res?.data ?? data?.data ?? [];
   return allLogs.map((entry) => ({
    type: entry.entityType,
    id: entry.entityId,
    action: entry.action,
    user: entry.userName,
    date: formatDateSafe(entry.createdAt),
   }));
  } catch (err) {
   const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
   console.error('Failed to export audit logs:', errorMsg);
   return (data?.data ?? []).map((entry) => ({
    type: entry.entityType,
    id: entry.entityId,
    action: entry.action,
    user: entry.userName,
    date: formatDateSafe(entry.createdAt),
   }));
  }
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
  <ExportMenu
    data={data?.data as unknown as Record<string, unknown>[] ?? []}
    columns={[
      { header: t('entity_type'), key: 'type' },
      { header: t('entity_id'), key: 'id' },
      { header: t('action'), key: 'action' },
      { header: t('user_name'), key: 'user' },
      { header: t('created_at'), key: 'date' },
    ]}
    filename="audit_logs"
    title={t('audit_logs.title')}
    onExportAll={handleExportAll}
  />
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

   <div className="flex-1 w-full min-h-[400px] md:min-h-0">
    <div className="hidden md:block w-full">
     <DataTable
     columns={columns}
     data={data?.data ?? []}
     isLoading={isLoading}
     collectionName="admin_audit_logs"
     enableVirtualization={true}
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
    </div>

    {!isLoading && (data?.data ?? []).length > 0 && (
     <div className="flex flex-col gap-3 md:hidden mt-4">
      {(data?.data ?? []).map((log) => (
       <div 
        key={log.id} 
        className={`bg-white dark:bg-[#1A2234] border rounded-lg p-3 flex flex-col gap-2 shadow-sm cursor-pointer transition-colors ${expandedId === log.id ? 'border-brand-gold dark:border-brand-gold bg-brand-gold/5' : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1A2234]/80'}`}
        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
       >
        
        {/* TOP TIER: Action & Identity */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1 w-full">
            {/* Entity Type & Action Inline */}
            <div className="flex justify-between items-start gap-2">
              <span className="font-mono text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase line-clamp-1">{log.entityType}</span>
              <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md h-auto shrink-0 border ${actionColors[log.action] ?? 'bg-surface-container-highest/20 text-muted-foreground border-white/5'}`}>
               {log.action}
              </span>
            </div>
            {/* Entity ID Inline */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono font-bold text-gray-900 dark:text-white line-clamp-1 truncate" dir="ltr">{log.entityId}</span>
            </div>
            {/* User & Date */}
            <div className="flex items-center justify-between gap-2 mt-1 border-t border-gray-100 dark:border-gray-800/50 pt-2">
              <span className="text-xs font-bold text-operational-cyan line-clamp-1">{log.userName}</span>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground tabular-nums shrink-0">
               <History className="w-3 h-3 opacity-50" />
               <ClientOnlyTime date={log.createdAt} mode="datetime" showSeconds={true} locale={locale} />
              </div>
            </div>
          </div>
        </div>

       </div>
      ))}
     </div>
    )}
   </div>

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
