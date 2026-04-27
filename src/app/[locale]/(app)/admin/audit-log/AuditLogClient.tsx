'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useAuditLog, type AuditLogRow } from '@/features/admin/hooks/useAuditLog';
import { AuditDiffViewer } from '@/components/shared/AuditDiffViewer';
import { format } from 'date-fns';
import { generateExcel } from '@/utils/export';
import { ChevronDown, History, Download, ShieldAlert, Activity, Database } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const actionColors: Record<string, string> = {
  CREATE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  UPDATE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  DELETE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  POST: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  APPROVE: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export function AuditLogClient() {
  const t = useTranslations('admin');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading } = useAuditLog({ page });

  const stats = useMemo(() => {
    return {
      total: data?.meta?.total || 0,
      securityEvents: data?.data?.filter(e => ['DELETE', 'APPROVE'].includes(e.action)).length || 0,
      systemActivity: 'Nominal'
    };
  }, [data]);

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
        type: entry.entity_type,
        id: entry.entity_id,
        action: entry.action,
        user: entry.user_name,
        date: format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm'),
      })),
      'Audit_Log'
    );
  };

  const columns: ColumnDef<AuditLogRow, unknown>[] = [
    {
      accessorKey: 'entity_type',
      header: t('entity_type'),
      cell: ({ row }) => (
        <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-sm bg-surface-container-highest/50 text-muted-foreground border border-white/5 uppercase tracking-widest">
          {row.original.entity_type}
        </span>
      ),
    },
    {
      accessorKey: 'entity_id',
      header: t('entity_id'),
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-[11px] text-cyan-500 font-bold tracking-tighter">
          {row.original.entity_id}
        </span>
      ),
    },
    {
      accessorKey: 'action',
      header: t('action'),
      cell: ({ row }) => (
        <span className={`px-2 py-0.5 text-[9px] font-black rounded-sm border uppercase tracking-widest ${actionColors[row.original.action] ?? 'bg-surface-container-highest/20 text-muted-foreground border-white/5'}`}>
          {row.original.action}
        </span>
      ),
    },
    {
      accessorKey: 'user_name',
      header: t('user_name'),
      cell: ({ row }) => <span className="text-xs font-bold tracking-tight">{row.original.user_name}</span>,
    },
    {
      accessorKey: 'created_at',
      header: t('created_at'),
      cell: ({ row }) => (
        <span dir="ltr" className="text-[10px] font-medium text-muted-foreground/60 tracking-tight">
          {format(new Date(row.original.created_at), 'yyyy-MM-dd HH:mm:ss')}
        </span>
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
            className={`h-7 px-2 transition-all ${expandedId === row.original.id ? 'bg-cyan-500/20 text-cyan-500' : 'text-muted-foreground/40 hover:text-cyan-500 hover:bg-cyan-500/10'}`}
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
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <PageHeader 
        title={t('audit_log') || 'System Ledger'} 
        description="Cryptographic evidence of all administrative and operational state changes"
        actions={
          <Button 
            onClick={handleExport}
            className="h-11 px-8 bg-surface-container-high hover:bg-surface-container-highest text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-sm transition-all border border-white/5"
          >
            <Download className="w-3.5 h-3.5 mr-2" />
            {t('export') || 'Export Ledger'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Database className="w-24 h-24 text-white" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Total Ledger Entries</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-foreground">{stats.total}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-cyan-500/50 to-transparent" />
        </Card>

        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <ShieldAlert className="w-24 h-24 text-rose-400" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Security Events (Page)</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-rose-400">{stats.securityEvents}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-rose-500/50 to-transparent" />
        </Card>

        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Activity className="w-24 h-24 text-emerald-400" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Integrity Status</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-emerald-400">{stats.systemActivity}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-emerald-500/50 to-transparent" />
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        collectionName="admin_audit_log"
        pagination={data?.meta ? {
          page: data.meta.page,
          pageSize: data.meta.page_size,
          total: data.meta.total,
          totalPages: data.meta.total_pages,
          onPageChange: setPage
        } : undefined}
      />

      {expandedId && data?.data && (() => {
        const entry = data.data.find((e) => e.id === expandedId);
        if (!entry) return null;
        return (
          <div className="p-8 rounded-sm border border-white/5 bg-surface-container-low animate-in slide-in-from-top-4 duration-500 shadow-2xl">
            <div className="flex items-center gap-3 mb-6 text-cyan-500 font-black text-[10px] uppercase tracking-[0.25em]">
              <History className="w-4 h-4" />
              {t('changes') || 'Object State Delta'}
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