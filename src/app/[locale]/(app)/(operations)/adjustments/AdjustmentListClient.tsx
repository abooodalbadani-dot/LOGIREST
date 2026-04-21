'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { FilterPanel } from '@/components/shared/DataTable/FilterPanel';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { useAdjustmentList, AdjustmentSummary } from '@/features/operations/hooks/useAdjustmentList';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

// Status → badge variant
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  POSTED:   'default',
  APPROVED: 'secondary',
  DRAFT:    'outline',
};

// Reason → TailwindCSS classes for colour-coded chip
const REASON_CHIP: Record<string, string> = {
  DAMAGE:        'bg-red-500/15 text-red-400 border border-red-500/30',
  EXPIRY:        'bg-red-500/15 text-red-400 border border-red-500/30',
  THEFT:         'bg-red-500/15 text-red-400 border border-red-500/30',
  COUNTING_ERROR:'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  OTHER:         'bg-surface-3 text-muted-foreground border border-surface-3',
};

// Human-readable reason labels (EN only; locale text comes from i18n if desired)
const REASON_LABEL: Record<string, string> = {
  DAMAGE:        'Damage',
  EXPIRY:        'Expiry',
  THEFT:         'Theft',
  COUNTING_ERROR:'Count Error',
  OTHER:         'Other',
};

export function AdjustmentListClient() {
  const t = useTranslations('operations.adjustment');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');

  const { data, isLoading } = useAdjustmentList({ status, page });

  const columns: any[] = [
    {
      accessorKey: 'document_number',
      header: t('doc_number'),
      cell: (row: AdjustmentSummary) => (
        <span dir="ltr" className="font-mono text-sm inline-block">
          {row.document_number}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: tCommon('status_label'),
      cell: (row: AdjustmentSummary) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? 'outline'}>
          {tCommon(`status.${row.status.toLowerCase()}` as any) || row.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'reason',
      header: t('reason'),
      cell: (row: AdjustmentSummary) => {
        const cls = REASON_CHIP[row.reason] ?? REASON_CHIP.OTHER;
        const label = REASON_LABEL[row.reason] ?? row.reason;
        return (
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold leading-5 ${cls}`}>
            {label}
          </span>
        );
      },
    },
    {
      accessorKey: 'warehouse_id',
      header: tCommon('warehouse'),
      cell: (row: AdjustmentSummary) => (
        <span className="text-sm text-muted-foreground">{row.warehouse_id}</span>
      ),
    },
    {
      accessorKey: 'approved_by',
      header: t('approved_by'),
      cell: (row: AdjustmentSummary) =>
        row.approved_by ? (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {row.approved_by}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        ),
    },
    {
      accessorKey: 'created_at',
      header: tCommon('doc_number').replace('Doc', 'Created').replace('رقم المستند', 'تاريخ الإنشاء'),
      cell: (row: AdjustmentSummary) =>
        row.created_at
          ? <span dir="ltr" className="text-sm text-muted-foreground">{format(new Date(row.created_at), 'MMM dd, yyyy')}</span>
          : '—',
    },
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
            <option value="">{tCommon('status.all')}</option>
            <option value="DRAFT">{tCommon('status.draft')}</option>
            <option value="APPROVED">{tCommon('status.approved')}</option>
            <option value="POSTED">{tCommon('status.posted')}</option>
          </select>
        </FilterPanel>
        <Link href="adjustments/new" className={buttonVariants({ variant: 'default' })}>
          <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
          {t('create_new')}
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        onRowClick={(row: any) => router.push(`adjustments/${row.id}`)}
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
