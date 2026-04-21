'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { useAuditLog, type AuditLogRow } from '@/features/admin/hooks/useAuditLog';
import { AuditDiffViewer } from '@/components/shared/AuditDiffViewer';
import { format } from 'date-fns';
import { generateCSV } from '@/utils/export';
import { ChevronDown, ChevronUp } from 'lucide-react';

const actionColors: Record<string, string> = {
  CREATE: 'bg-neon-green/20 text-neon-green',
  UPDATE: 'bg-neon-amber/20 text-neon-amber',
  DELETE: 'bg-neon-red/20 text-neon-red',
  POST: 'bg-neon-cyan/20 text-neon-cyan',
  APPROVE: 'bg-blue-900/40 text-blue-300',
};

export function AuditLogClient() {
  const t = useTranslations('admin');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading } = useAuditLog({ page });

  const handleExport = () => {
    if (!data?.data) return;
    generateCSV(
      [t('entity_type'), t('entity_id'), t('action'), t('user_name'), t('created_at')],
      data.data.map((entry) => [
        entry.entity_type,
        entry.entity_id,
        entry.action,
        entry.user_name,
        entry.created_at,
      ]),
      'audit-log.csv',
    );
  };

  const columns: any[] = [
    {
      accessorKey: 'entity_type',
      header: t('entity_type'),
      cell: (row: AuditLogRow) => <span className="font-mono text-sm">{row.entity_type}</span>,
    },
    {
      accessorKey: 'entity_id',
      header: t('entity_id'),
      cell: (row: AuditLogRow) => (
        <span dir="ltr" className="font-mono text-sm text-neon-cyan">{row.entity_id}</span>
      ),
    },
    {
      accessorKey: 'action',
      header: t('action'),
      cell: (row: AuditLogRow) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${actionColors[row.action] ?? 'bg-surface-3 text-on-surface-muted'}`}>
          {row.action}
        </span>
      ),
    },
    {
      accessorKey: 'user_name',
      header: t('user_name'),
      cell: (row: AuditLogRow) => row.user_name,
    },
    {
      accessorKey: 'created_at',
      header: t('created_at'),
      cell: (row: AuditLogRow) => (
        <span dir="ltr">{format(new Date(row.created_at), 'yyyy-MM-dd HH:mm')}</span>
      ),
    },
    {
      accessorKey: 'expand',
      header: t('changes'),
      cell: (row: AuditLogRow) => (
        <button
          className="text-on-surface-muted hover:text-on-surface transition-colors"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); setExpandedId(expandedId === row.id ? null : row.id); }}
        >
          {expandedId === row.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        onExport={handleExport}
      />

      {expandedId && data?.data && (() => {
        const entry = data.data.find((e) => e.id === expandedId);
        if (!entry) return null;
        return (
          <div className="ms-8 border border-surface-3 rounded bg-surface-1 p-4">
            <AuditDiffViewer changes={entry.changes} />
          </div>
        );
      })()}

      {data?.meta && data.meta.total_pages > 1 && (
        <Pagination page={page} totalPages={data.meta.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}