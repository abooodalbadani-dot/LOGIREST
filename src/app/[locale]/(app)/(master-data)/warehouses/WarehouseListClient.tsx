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
import { WarehouseSchema, type Warehouse } from '@/types/master-data';

const WAREHOUSE_TYPE_CLASSES: Record<string, string> = {
  MAIN: 'text-blue-400', DRY: 'text-amber-400', COLD: 'text-cyan-400', VIRTUAL: 'text-violet-400'
};

export function WarehouseListClient() {
  const tc = useTranslations('masterData.common');
  const t = useTranslations('masterData.warehouses');
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMasterDataList('warehouses', WarehouseSchema, { page: String(page) });

  const columns: any[] = [
    { accessorKey: 'code', header: tc('code'), cell: (r: Warehouse) => <span dir="ltr" className="font-mono text-sm">{r.code}</span> },
    { accessorKey: 'name_ar', header: tc('name_ar'), cell: (r: Warehouse) => r.name_ar },
    { accessorKey: 'name_en', header: tc('name_en'), cell: (r: Warehouse) => r.name_en },
    {
      accessorKey: 'type', header: t('type'),
      cell: (r: Warehouse) => <span className={`font-semibold text-sm ${WAREHOUSE_TYPE_CLASSES[r.type] ?? ''}`}>{r.type}</span>
    },
    {
      accessorKey: 'is_active', header: tc('is_active'),
      cell: (r: Warehouse) => r.is_active ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link href="warehouses/new" className={buttonVariants({ variant: 'default' })}>
          <Plus className="w-4 h-4 me-2" />{tc('create_new')}
        </Link>
      </div>
      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading}
        onRowClick={(r: Warehouse) => router.push(`warehouses/${r.id}`)} />
      {data?.meta && data.meta.total_pages > 1 && (
        <Pagination page={page} totalPages={data.meta.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}
