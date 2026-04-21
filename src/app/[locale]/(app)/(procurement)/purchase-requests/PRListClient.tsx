'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { FilterPanel } from '@/components/shared/DataTable/FilterPanel';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { usePRList, PRSummary } from '@/features/purchasing/hooks/usePRList';
import { Button, buttonVariants } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';

export function PRListClient() {
  const t = useTranslations('procurement.pr');
  const tCommon = useTranslations('common');
  const router = useRouter();
  
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');

  const { data, isLoading } = usePRList({ status, page });

  const columns: any[] = [
    {
      accessorKey: 'document_number',
      header: t('doc_number'),
      cell: (row: PRSummary) => (
        <span dir="ltr" className="font-mono text-sm inline-block">
          {row.document_number}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: t('title'), // generic header
      cell: (row: PRSummary) => (
        <Badge variant={
          row.status === 'APPROVED' ? 'default' : 
          row.status === 'REJECTED' ? 'destructive' : 
          'secondary'
        }>
          {tCommon(`status.${row.status.toLowerCase()}` as any) || row.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'department_id',
      header: t('department'),
      cell: (row: PRSummary) => row.department_id,
    },
    {
      accessorKey: 'expected_date',
      header: t('expected_date'),
      cell: (row: PRSummary) => row.expected_date ? format(new Date(row.expected_date), 'MMM dd, yyyy') : '-',
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
          </select>
        </FilterPanel>
        <Link href="purchase-requests/new" className={buttonVariants({ variant: 'default' })}>
            <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {t('create_new')}
          </Link>
      </div>

      <DataTable 
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        onRowClick={(row: any) => router.push(`purchase-requests/${row.id}`)}
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
