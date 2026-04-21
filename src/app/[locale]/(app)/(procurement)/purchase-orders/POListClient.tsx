'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { FilterPanel } from '@/components/shared/DataTable/FilterPanel';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { usePOList, POSummary } from '@/features/purchasing/hooks/usePOList';
import { Button, buttonVariants } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';

export function POListClient() {
  const t = useTranslations('procurement.po');
  const tCommon = useTranslations('common');
  const router = useRouter();
  
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');

  const { data, isLoading } = usePOList({ status, page });

  const columns: any[] = [
    {
      accessorKey: 'document_number',
      header: t('doc_number'),
      cell: (row: POSummary) => (
        <span dir="ltr" className="font-mono text-sm inline-block">
          {row.document_number}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (row: POSummary) => (
        <Badge variant={
          row.status === 'POSTED' ? 'default' : 
          row.status === 'DRAFT' ? 'secondary' : 
          'outline'
        }>
          {tCommon(`status.${row.status.toLowerCase()}` as any) || row.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'supplier_id',
      header: t('supplier'),
      cell: (row: POSummary) => row.supplier_id,
    },
    {
      accessorKey: 'currency_id',
      header: 'Currency',
      cell: (row: POSummary) => row.currency_id,
    },
    {
      accessorKey: 'expected_delivery_date',
      header: t('expected_delivery_date') || 'Expected Delivery',
      cell: (row: POSummary) => row.expected_delivery_date ? format(new Date(row.expected_delivery_date), 'MMM dd, yyyy') : '-',
    },
    {
      accessorKey: 'total',
      header: 'Total',
      cell: (row: POSummary) => (
        <span dir="ltr" className="font-mono text-sm inline-block">
          {row.total?.toLocaleString() ?? '-'}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      cell: (row: POSummary) => row.created_at ? format(new Date(row.created_at), 'MMM dd, yyyy') : '-',
    }
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
            <option value="DRAFT">{tCommon('status.draft')}</option>
            <option value="APPROVED">{tCommon('status.approved')}</option>
            <option value="REJECTED">{tCommon('status.rejected')}</option>
            <option value="POSTED">{tCommon('status.posted')}</option>
          </select>
        </FilterPanel>
        <Link href="purchase-orders/new" className={buttonVariants({ variant: 'default' })}>
            <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {t('create_new')}
          </Link>
      </div>

      <DataTable 
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        onRowClick={(row: any) => router.push(`purchase-orders/${row.id}`)}
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
