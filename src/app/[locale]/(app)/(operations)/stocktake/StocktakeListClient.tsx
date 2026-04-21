'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useStocktakeList } from '@/features/operations/hooks/useStocktakeList';
import { useStartStocktake } from '@/features/operations/hooks/useStartStocktake';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { Button } from '@/components/ui/button';
import type { ColumnDef } from '@tanstack/react-table';
import type { StocktakeSummary } from '@/features/operations/hooks/useStocktakeList';

interface StocktakeListClientProps {
  initialStatus?: string;
  initialPage: number;
  initialWarehouseId?: string;
  locale: 'ar' | 'en';
}

const WAREHOUSES = [
  { id: 'wh-1', name_ar: 'المستودع الرئيسي', name_en: 'Main Warehouse' },
  { id: 'wh-2', name_ar: 'المستودع البارد', name_en: 'Cold Storage' },
];

export function StocktakeListClient({ initialStatus, initialPage, locale }: StocktakeListClientProps) {
  const t = useTranslations('operations.stocktake');
  const router = useRouter();

  const [page, setPage] = useState(initialPage);
  const [status, setStatus] = useState(initialStatus ?? '');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('wh-1');
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [alreadyLockedError, setAlreadyLockedError] = useState(false);

  const { data, isLoading } = useStocktakeList({ status: status || undefined, page });
  const startStocktake = useStartStocktake();
  const { data: lockState } = useWarehouseLock(selectedWarehouseId);

  const isSelectedLocked = lockState?.is_locked ?? false;

  const handleStartSession = async () => {
    if (isSelectedLocked) {
      setAlreadyLockedError(true);
      return;
    }
    try {
      const session = await startStocktake.mutateAsync({ warehouse_id: selectedWarehouseId });
      setIsStartDialogOpen(false);
      router.push(`/${locale}/stocktake/${session.id}`);
    } catch {
      setAlreadyLockedError(true);
    }
  };

  const columns: ColumnDef<StocktakeSummary>[] = [
    {
      accessorKey: 'session_number',
      header: 'Session No.',
      cell: ({ row }) => (
        <Link href={`/${locale}/stocktake/${row.original.id}`} className="text-neon-cyan hover:underline font-mono">
          <span dir="ltr">{row.original.session_number}</span>
        </Link>
      ),
    },
    {
      accessorKey: 'warehouse_id',
      header: 'Warehouse',
      cell: ({ row }) => {
        const wh = WAREHOUSES.find(w => w.id === row.original.warehouse_id);
        return wh ? (locale === 'ar' ? wh.name_ar : wh.name_en) : row.original.warehouse_id;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'snapshot_at',
      header: 'Snapshot At',
      cell: ({ row }) => <span dir="ltr">{new Date(row.original.snapshot_at).toLocaleDateString()}</span>,
    },
    {
      accessorKey: 'started_by',
      header: 'Started By',
    },
    {
      accessorKey: 'posted_at',
      header: 'Posted At',
      cell: ({ row }) => row.original.posted_at
        ? <span dir="ltr">{new Date(row.original.posted_at).toLocaleDateString()}</span>
        : '—',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {/* Status filter */}
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="bg-surface-2 border border-surface-3 text-on-surface rounded px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="COUNTING">Counting</option>
          <option value="REVIEW">Review</option>
          <option value="POSTED">Posted</option>
        </select>

        <Button
          onClick={() => { setAlreadyLockedError(false); setIsStartDialogOpen(true); }}
          className="bg-neon-cyan text-surface-0 hover:bg-neon-cyan/80"
        >
          {t('start_session')}
        </Button>
      </div>

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        pagination={data ? { page, pageSize: data.meta.page_size, total: data.meta.total, totalPages: data.meta.total_pages, onPageChange: setPage } : undefined}
        emptyState={<div className="text-center py-12 text-on-surface-muted">No stocktake sessions found.</div>}
      />

      {/* Start Session Dialog */}
      {isStartDialogOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold">{t('start_session')}</h2>

            <div>
              <label className="text-sm text-on-surface-muted block mb-1">{t('warehouse_selector')}</label>
              <select
                value={selectedWarehouseId}
                onChange={e => { setSelectedWarehouseId(e.target.value); setAlreadyLockedError(false); }}
                className="w-full bg-surface-2 border border-surface-3 text-on-surface rounded px-3 py-2"
              >
                {WAREHOUSES.map(w => (
                  <option key={w.id} value={w.id}>{locale === 'ar' ? w.name_ar : w.name_en}</option>
                ))}
              </select>
            </div>

            {alreadyLockedError && (
              <div className="bg-neon-red/10 border border-neon-red/30 rounded p-3 text-neon-red text-sm" role="alert">
                {t('already_locked')}
              </div>
            )}

            <div className="bg-neon-amber/10 border border-neon-amber/30 rounded p-3 text-neon-amber text-sm">
              {t('start_confirm_desc')}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsStartDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleStartSession}
                disabled={startStocktake.isPending || isSelectedLocked}
                className="bg-neon-cyan text-surface-0 hover:bg-neon-cyan/80"
              >
                {startStocktake.isPending ? 'Starting...' : t('start_session')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
