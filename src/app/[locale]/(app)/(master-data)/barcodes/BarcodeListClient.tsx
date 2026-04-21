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
import { BarcodeSchema, type Barcode } from '@/types/master-data';

export function BarcodeListClient() {
  const tc = useTranslations('masterData.common');
  const tb = useTranslations('masterData.barcodes');
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMasterDataList('barcodes', BarcodeSchema, { page: String(page) });

  const columns: any[] = [
    { accessorKey: 'barcode', header: tb('barcode_label'), cell: (r: Barcode) => <span dir="ltr" className="font-mono">{r.barcode}</span> },
    { accessorKey: 'item_id', header: tb('item'), cell: (r: Barcode) => <span dir="ltr">{r.item_id}</span> }, // In real app, would join with item name
    { accessorKey: 'default_qty', header: tb('default_qty'), cell: (r: Barcode) => <span dir="ltr" className="font-mono">{r.default_qty}</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link href="barcodes/new" className={buttonVariants({ variant: 'default' })}>
          <Plus className="w-4 h-4 me-2" />{tc('create_new')}
        </Link>
      </div>
      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading}
        onRowClick={(r: Barcode) => router.push(`barcodes/${r.id}`)} />
      {data?.meta && data.meta.total_pages > 1 && (
        <Pagination page={page} totalPages={data.meta.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}
