'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { UoMSchema, type UoM } from '@/types/master-data';

export function UoMListClient() {
  const tc = useTranslations('masterData.common');
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMasterDataList('units-of-measure', UoMSchema, { page: String(page) });

  const columns: any[] = [
    { accessorKey: 'code', header: tc('code'), cell: (r: UoM) => <span dir="ltr" className="font-mono text-sm">{r.code}</span> },
    { accessorKey: 'name_ar', header: tc('name_ar'), cell: (r: UoM) => r.name_ar },
    { accessorKey: 'name_en', header: tc('name_en'), cell: (r: UoM) => r.name_en },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link href="units-of-measure/new" className={buttonVariants({ variant: 'default' })}>
          <Plus className="w-4 h-4 me-2" />{tc('create_new')}
        </Link>
      </div>
      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading}
        onRowClick={(r: UoM) => router.push(`units-of-measure/${r.id}`)} />
      {data?.meta && data.meta.total_pages > 1 && (
        <Pagination page={page} totalPages={data.meta.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}
