'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useGRNList } from '@/features/purchasing/hooks/useGRNList';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { LockBanner } from '@/components/shared/LockBanner';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { FilterPanel } from '@/components/shared/DataTable/FilterPanel';
import { Pagination } from '@/components/shared/DataTable/Pagination';

export function GRNListClient({
  initialStatus,
  initialPage,
  locale,
}: {
  initialStatus?: string;
  initialPage: number;
  locale: 'ar' | 'en';
}) {
  const [status, setStatus] = useState<string | undefined>(initialStatus);
  const [page, setPage] = useState(initialPage);

  const { data, isLoading } = useGRNList({ status, page });

  const warehouseId = 'wh-1';
  const { data: lockState } = useWarehouseLock(warehouseId);

  const columns: any[] = [
    {
      header: 'Document Number',
      accessorKey: 'document_number',
      cell: (row: { id: string; document_number: string }) => (
        <Link href={`/${locale}/goods-received/${row.id}`} className="text-brand-primary hover:underline">
          {row.document_number}
        </Link>
      ),
    },
    { header: 'Status', accessorKey: 'status' },
    { header: 'Supplier ID', accessorKey: 'supplier_id' },
    { header: 'Currency', accessorKey: 'currency_id' },
    {
      header: 'Posted At',
      accessorKey: 'posted_at',
      cell: (row: { posted_at: string | null }) =>
        row.posted_at ? <span dir="ltr">{new Date(row.posted_at).toLocaleString()}</span> : '—',
    },
    {
      header: 'Created At',
      accessorKey: 'created_at',
      cell: (row: { created_at: string }) => (
        <span dir="ltr">{new Date(row.created_at).toLocaleString()}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <LockBanner lockState={lockState} />

      {/* FilterPanel is slot-based — children are the filter controls */}
      <FilterPanel onReset={() => { setStatus(undefined); setPage(1); }}>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-muted">Status</label>
          <select
            value={status ?? ''}
            onChange={e => { setStatus(e.target.value || undefined); setPage(1); }}
            className="bg-surface-2 border border-surface-3 text-on-surface rounded px-3 py-1.5 text-sm min-w-36"
          >
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
            <option value="POSTED">Posted</option>
          </select>
        </div>
      </FilterPanel>

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
      />

      {data?.meta && data.meta.total_pages > 1 && (
        <Pagination
          page={data.meta.page}
          totalPages={data.meta.total_pages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
