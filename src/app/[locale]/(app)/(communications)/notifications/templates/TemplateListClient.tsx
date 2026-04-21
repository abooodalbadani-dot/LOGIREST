'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle2, XCircle } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { useNotificationTemplates, type NotificationTemplateRow } from '@/features/notifications/hooks/useNotificationTemplates';

export function TemplateListClient() {
  const t = useTranslations('notifications');
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotificationTemplates({ page });

  const columns: any[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: (row: NotificationTemplateRow) => <span dir="ltr" className="font-mono text-sm">{row.code}</span>,
    },
    {
      accessorKey: 'trigger_event',
      header: t('trigger_event'),
      cell: (row: NotificationTemplateRow) => row.trigger_event,
    },
    {
      accessorKey: 'is_active',
      header: t('is_active'),
      cell: (row: NotificationTemplateRow) => row.is_active
        ? <CheckCircle2 className="w-4 h-4 text-neon-green" />
        : <XCircle className="w-4 h-4 text-red-400" />,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={(row: NotificationTemplateRow) => router.push(`templates/${row.id}`)}
      />
      {data?.meta && data.meta.total_pages > 1 && (
        <Pagination page={page} totalPages={data.meta.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}