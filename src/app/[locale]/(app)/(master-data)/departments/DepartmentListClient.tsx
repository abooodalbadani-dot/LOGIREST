'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, CheckCircle2, XCircle } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { DepartmentSchema, type Department } from '@/types/master-data';

export function DepartmentListClient() {
  const tc = useTranslations('masterData.common');
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMasterDataList('departments', DepartmentSchema, { page: String(page) });

  const columns: any[] = [
    { accessorKey: 'code', header: tc('code'), cell: (r: Department) => <span dir="ltr" className="font-mono text-sm">{r.code}</span> },
    { accessorKey: 'name_ar', header: tc('name_ar'), cell: (r: Department) => r.name_ar },
    { accessorKey: 'name_en', header: tc('name_en'), cell: (r: Department) => r.name_en },
    { accessorKey: 'is_active', header: tc('is_active'), cell: (r: Department) => r.is_active ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link href="departments/new" className={buttonVariants({ variant: 'default' })}>
          <Plus className="w-4 h-4 me-2" />{tc('create_new')}
        </Link>
      </div>
      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading}
        onRowClick={(r: Department) => router.push(`departments/${r.id}`)} />
      {data?.meta && data.meta.total_pages > 1 && (
        <Pagination page={page} totalPages={data.meta.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}
