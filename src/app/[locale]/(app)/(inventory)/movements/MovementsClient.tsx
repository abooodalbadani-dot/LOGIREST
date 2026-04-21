'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { useInventoryMovements } from '@/features/inventory/hooks/useInventoryMovements';
import type { InventoryMovement } from '@/types/inventory';

interface MovementsClientProps {
  locale: string;
  title: string;
}

export default function MovementsClient({ locale, title }: MovementsClientProps) {
  const t = useTranslations('inventory.movements');
  const currentLocale = useLocale();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useInventoryMovements({ page });

  const getDocumentPath = (movement: InventoryMovement): string => {
    const base = `/${currentLocale}`;
    switch (movement.document_type) {
      case 'GRN': return `${base}/procurement/grn/${movement.document_id}`;
      case 'ISSUE': return `${base}/operations/issues/${movement.document_id}`;
      case 'TRANSFER': return `${base}/operations/transfers/${movement.document_id}`;
      default: return '#';
    }
  };

  const typeChipClass = (docType: string): string => {
    switch (docType) {
      case 'GRN': return 'bg-neon-green/20 text-neon-green';
      case 'ISSUE': return 'bg-neon-amber/20 text-neon-amber';
      case 'TRANSFER': return 'bg-blue-900/40 text-blue-300';
      default: return 'bg-surface-3 text-on-surface-muted';
    }
  };

  const columns = useMemo<ColumnDef<InventoryMovement, unknown>[]>(() => [
    {
      accessorKey: 'posted_at',
      header: t('posted_at'),
      cell: ({ getValue }) => {
        const val = getValue() as string;
        return <span dir="ltr">{new Date(val).toLocaleString(currentLocale === 'ar' ? 'ar-SA' : 'en-US')}</span>;
      },
    },
    {
      id: 'document_number',
      header: t('document_number'),
      cell: ({ row }) => (
        <Link
          href={getDocumentPath(row.original)}
          className="text-neon-cyan hover:underline"
        >
          {row.original.document_number}
        </Link>
      ),
    },
    {
      accessorKey: 'document_type',
      header: t('document_type'),
      cell: ({ getValue }) => {
        const docType = getValue() as string;
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeChipClass(docType)}`}>
            {docType}
          </span>
        );
      },
    },
    {
      accessorKey: 'item_code',
      header: t('item_code'),
      cell: ({ getValue }) => <span dir="ltr">{getValue() as string}</span>,
    },
    {
      id: 'item_name',
      header: t('item_name'),
      cell: ({ row }) => currentLocale === 'ar' ? row.original.item_name_ar : row.original.item_name_en,
    },
    {
      accessorKey: 'lot_number',
      header: t('lot'),
      cell: ({ getValue }) => {
        const val = getValue() as string | null;
        return val ? <span dir="ltr">{val}</span> : <span className="text-on-surface-muted">—</span>;
      },
    },
    {
      accessorKey: 'direction',
      header: t('direction'),
      cell: ({ getValue }) => {
        const dir = getValue() as string;
        if (dir === 'IN') {
          return (
            <span className="inline-flex items-center gap-1 text-neon-green font-bold">
              <span>↑</span> {t('in')}
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-neon-red font-bold">
            <span>↓</span> {t('out')}
          </span>
        );
      },
    },
    {
      accessorKey: 'qty',
      header: t('qty'),
      meta: { numeric: true },
      cell: ({ getValue }) => <span dir="ltr">{getValue() as number}</span>,
    },
  ], [t, currentLocale]);

  const pagination = data?.meta ? {
    page: data.meta.page,
    pageSize: data.meta.page_size,
    total: data.meta.total,
    totalPages: data.meta.total_pages,
    onPageChange: setPage,
  } : undefined;

  return (
    <div className="p-6">
      <PageHeader title={title} />

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        pagination={pagination}
        emptyState={<div className="text-on-surface-muted">{t('title')}</div>}
      />
    </div>
  );
}
