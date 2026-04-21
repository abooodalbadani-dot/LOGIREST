'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { FilterPanel } from '@/components/shared/DataTable/FilterPanel';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { useTransferList, TransferSummary } from '@/features/operations/hooks/useTransferList';
import { buttonVariants } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  POSTED:     'default',
  RECEIVED:   'default',
  IN_TRANSIT: 'secondary',
  DRAFT:      'outline',
};

export function TransferListClient() {
  const t = useTranslations('operations.transfer');
  const tCommon = useTranslations('common');
  const router = useRouter();
  
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');

  const { data, isLoading } = useTransferList({ status, page });

  const columns: any[] = [
    {
      accessorKey: 'document_number',
      header: tCommon('doc_number'),
      cell: (row: TransferSummary) => (
        <span dir="ltr" className="font-mono text-sm inline-block">
          {row.document_number}
        </span>
      ),
    },
    {
      accessorKey: 'from_warehouse_id',
      header: t('from_warehouse'),
      cell: (row: TransferSummary) => row.from_warehouse_id,
    },
    {
      accessorKey: 'to_warehouse_id',
      header: t('to_warehouse'),
      cell: (row: TransferSummary) => row.to_warehouse_id,
    },
    {
      accessorKey: 'transfer_status',
      header: tCommon('status_label'),
      cell: (row: TransferSummary) => (
        <Badge variant={STATUS_VARIANT[row.transfer_status] ?? 'outline'}>
          {row.transfer_status}
        </Badge>
      ),
    },
    {
      accessorKey: 'shipped_at',
      header: t('shipped_at'),
      cell: (row: TransferSummary) =>
        row.shipped_at ? (
          <span dir="ltr" className="text-sm">{format(new Date(row.shipped_at), 'MMM dd, yyyy')}</span>
        ) : '—',
    },
    {
      accessorKey: 'received_at',
      header: t('received_at'),
      cell: (row: TransferSummary) =>
        row.received_at ? (
          <span dir="ltr" className="text-sm">{format(new Date(row.received_at), 'MMM dd, yyyy')}</span>
        ) : '—',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <FilterPanel onReset={() => { setStatus(''); setPage(1); }}>
          <select 
            value={status} 
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-surface-2 border border-surface-3 rounded w-full md:w-64"
          >
            <option value="">{tCommon('status.all') || 'All Statuses'}</option>
            <option value="DRAFT">DRAFT</option>
            <option value="IN_TRANSIT">IN_TRANSIT</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="POSTED">POSTED</option>
          </select>
        </FilterPanel>
        <Link href="transfers/new" className={buttonVariants({ variant: 'default' })}>
          <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
          {t('create_new')}
        </Link>
      </div>

      <DataTable 
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        onRowClick={(row: any) => router.push(`transfers/${row.id}`)}
      />

      {data?.meta && data.meta.total_pages > 1 && (
        <Pagination 
          page={page}
          totalPages={data.meta.total_pages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
