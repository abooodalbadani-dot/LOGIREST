'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { useEmailOutbox, type EmailOutboxRow } from '@/features/notifications/hooks/useEmailOutbox';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  PENDING: 'bg-neon-amber/20 text-neon-amber',
  SENT: 'bg-neon-green/20 text-neon-green',
  FAILED: 'bg-neon-red/20 text-neon-red',
};

export function EmailOutboxClient() {
  const t = useTranslations('notifications');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading } = useEmailOutbox({ status: statusFilter || undefined, page });

  const columns: any[] = [
    {
      accessorKey: 'recipient_email',
      header: t('recipient'),
      cell: (row: EmailOutboxRow) => <span dir="ltr">{row.recipient_email}</span>,
    },
    {
      accessorKey: 'subject',
      header: t('subject_ar').includes('عربي') ? 'الموضوع' : 'Subject',
      cell: (row: EmailOutboxRow) => row.subject,
    },
    {
      accessorKey: 'status',
      header: t('status'),
      cell: (row: EmailOutboxRow) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[row.status] ?? 'bg-surface-3 text-on-surface-muted'}`}>
          {row.status}
        </span>
      ),
    },
    {
      accessorKey: 'sent_at',
      header: t('sent_at'),
      cell: (row: EmailOutboxRow) => row.sent_at
        ? <span dir="ltr">{format(new Date(row.sent_at), 'yyyy-MM-dd HH:mm')}</span>
        : '—',
    },
    {
      accessorKey: 'error_message',
      header: t('error_message'),
      cell: (row: EmailOutboxRow) => row.error_message
        ? <span className="text-neon-red text-xs">{row.error_message}</span>
        : '—',
    },
    {
      accessorKey: 'retry',
      header: t('retry'),
      cell: (row: EmailOutboxRow) => row.status === 'FAILED'
        ? (
          <button
            className="px-2 py-1 text-xs bg-neon-amber/20 text-neon-amber rounded hover:bg-neon-amber/30 transition-colors"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); }}
          >
            {t('retry')}
          </button>
        )
        : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {['', 'PENDING', 'SENT', 'FAILED'].map((s) => (
          <button
            key={s}
            className={`px-3 py-1.5 text-sm rounded border transition-colors ${
              statusFilter === s
                ? 'bg-neon-cyan text-surface-0 border-neon-cyan'
                : 'bg-surface-2 text-on-surface-muted border-surface-3 hover:bg-surface-3'
            }`}
            onClick={() => { setStatusFilter(s); setPage(1); }}
          >
            {s || (t('status').includes('الحالة') ? 'الكل' : 'All')}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
      />

      {data?.meta && data.meta.total_pages > 1 && (
        <Pagination page={page} totalPages={data.meta.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}