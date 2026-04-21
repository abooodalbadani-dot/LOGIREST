'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Star } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { CurrencySchema, type Currency } from '@/types/master-data';

export function CurrencyListClient() {
  const tc = useTranslations('masterData.common');
  const t = useTranslations('masterData.currencies');
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMasterDataList('currencies', CurrencySchema, { page: String(page) });

  const columns: any[] = [
    {
      accessorKey: 'code',
      header: tc('code'),
      cell: (r: Currency) => (
        <span dir="ltr" className="font-mono font-semibold text-sm">{r.code}</span>
      ),
    },
    { accessorKey: 'symbol', header: t('symbol'), cell: (r: Currency) => <span dir="ltr">{r.symbol}</span> },
    { accessorKey: 'name_ar', header: tc('name_ar'), cell: (r: Currency) => r.name_ar },
    { accessorKey: 'name_en', header: tc('name_en'), cell: (r: Currency) => r.name_en },
    {
      accessorKey: 'is_base',
      header: t('is_base'),
      cell: (r: Currency) => r.is_base
        ? <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
        : null,
    },
    {
      accessorKey: 'fx_rates',
      header: t('fx_rates_title'),
      cell: (r: Currency) => (
        <Link
          href={`currencies/${r.id}/fx-rates`}
          className="text-xs text-neon-cyan underline"
          onClick={(e) => e.stopPropagation()}
        >
          {t('fx_rates_title')} →
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link href="currencies/new" className={buttonVariants({ variant: 'default' })}>
          <Plus className="w-4 h-4 me-2" />{tc('create_new')}
        </Link>
      </div>
      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading}
        onRowClick={(r: Currency) => router.push(`currencies/${r.id}`)} />
      {data?.meta && data.meta.total_pages > 1 && (
        <Pagination page={page} totalPages={data.meta.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}
