'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, CheckCircle2, XCircle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { BranchSchema, type Branch } from '@/types/master-data';
import { format } from 'date-fns';

export function BranchListClient() {
  const t = useTranslations('masterData.branches');
  const tc = useTranslations('masterData.common');
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMasterDataList('branches', BranchSchema, { page: String(page) });

  const columns = [
    {
      accessorKey: 'code',
      header: tc('code'),
      cell: (row: Branch) => <span dir="ltr" className="font-mono text-sm">{row.code}</span>,
    },
    {
      accessorKey: 'name_ar',
      header: tc('name_ar'),
      cell: (row: Branch) => row.name_ar,
    },
    {
      accessorKey: 'name_en',
      header: tc('name_en'),
      cell: (row: Branch) => row.name_en,
    },
    {
      accessorKey: 'is_active',
      header: tc('is_active'),
      cell: (row: Branch) => row.is_active
        ? <CheckCircle2 className="w-4 h-4 text-green-400" />
        : <XCircle className="w-4 h-4 text-red-400" />,
    },
    {
      accessorKey: 'created_at',
      header: t('created_at'),
      cell: (row: Branch) => <span dir="ltr">{format(new Date(row.created_at), 'MMM dd, yyyy')}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link href="branches/new" className={buttonVariants({ variant: 'default' })}>
          <Plus className="w-4 h-4 me-2" />
          {tc('create_new')}
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={(row: Branch) => router.push(`branches/${row.id}`)}
      />

      {data?.meta && data.meta.total_pages > 1 && (
        <Pagination page={page} totalPages={data.meta.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}
