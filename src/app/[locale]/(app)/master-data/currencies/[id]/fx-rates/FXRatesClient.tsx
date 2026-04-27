'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useMasterDataList, useMasterDataCreate } from '@/features/master-data/hooks/useMasterDataCRUD';
import { FXRateSchema, FXRateFormSchema, CurrencySchema, type FXRate, type FXRateFormValues } from '@/types/master-data';
import { format } from 'date-fns';

interface Props { currencyId: string; }

export function FXRatesClient({ currencyId }: Props) {
  const t = useTranslations('masterData.currencies');
  const tc = useTranslations('masterData.common');

  // Fetch rates for this currency pair
  const { data: ratesData, isLoading } = useMasterDataList(
    'currencies/fx-rates',
    FXRateSchema,
    { from: currencyId },
  );

  // Fetch all currencies for the "To" selector
  const { data: currencies } = useMasterDataList('currencies', CurrencySchema);

  const create = useMasterDataCreate('currencies/fx-rates', FXRateSchema);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FXRateFormValues>({
    resolver: zodResolver(FXRateFormSchema),
    defaultValues: {
      from_currency_id: currencyId,
      to_currency_id: '',
      rate: 0,
      effective_date: new Date().toISOString().substring(0, 10),
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await create.mutateAsync(values);
    reset({ from_currency_id: currencyId, to_currency_id: '', rate: 0, effective_date: new Date().toISOString().substring(0, 10) });
  });

  const columns: ColumnDef<FXRate>[] = [
    { 
      accessorKey: 'to_currency_id', 
      header: t('to_currency'), 
      cell: ({ row }) => <span dir="ltr" className="font-mono">{row.original.to_currency_id}</span> 
    },
    {
      accessorKey: 'rate',
      header: t('rate'),
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono font-semibold tabular-nums">{row.original.rate.toFixed(4)}</span>
      ),
    },
    {
      accessorKey: 'effective_date',
      header: t('effective_date'),
      cell: ({ row }) => <span dir="ltr">{format(new Date(row.original.effective_date), 'MMM dd, yyyy')}</span>,
    },
    {
      id: 'lock',
      header: '',
      cell: () => <Lock className="w-3 h-3 text-text-muted" aria-label="Immutable" />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Back to currencies */}
      <div className="flex items-center gap-2">
        <Link href="../../currencies">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {tc('cancel')}
          </Button>
        </Link>
      </div>

      {/* Immutability notice */}
      <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded px-3 py-2">
        {t('rate_immutable_note')}
      </p>

      {/* Existing rates */}
      <DataTable columns={columns} data={ratesData?.data ?? []} isLoading={isLoading} />

      {/* Add rate form */}
      <div className="bg-surface-1 border border-surface-2 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-sm">{t('add_rate')}</h2>

        <div className="grid grid-cols-3 gap-4 items-end">
          {/* To currency */}
          <div className="grid gap-1.5">
            <Label htmlFor="fx-to">{t('to_currency')}</Label>
            <select id="fx-to" {...register('to_currency_id')}
              className="px-3 py-2 bg-surface-2 border border-surface-3 rounded w-full text-sm">
              <option value="">—</option>
              {currencies?.data
                ?.filter((c) => c.id !== currencyId)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name_en}</option>
                ))}
            </select>
            {errors.to_currency_id && <p className="text-xs text-red-400">{errors.to_currency_id.message}</p>}
          </div>

          {/* Rate */}
          <div className="grid gap-1.5">
            <Label htmlFor="fx-rate">{t('rate')}</Label>
            <Input id="fx-rate" type="number" dir="ltr" step="any" min={0}
              {...register('rate', { valueAsNumber: true })} />
            {errors.rate && <p className="text-xs text-red-400">{errors.rate.message}</p>}
          </div>

          {/* Effective date */}
          <div className="grid gap-1.5">
            <Label htmlFor="fx-date">{t('effective_date')}</Label>
            <Input id="fx-date" type="date" dir="ltr" {...register('effective_date')} />
            {errors.effective_date && <p className="text-xs text-red-400">{errors.effective_date.message}</p>}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onSubmit} disabled={create.isPending}>
            {create.isPending ? tc('saving') : t('add_rate')}
          </Button>
        </div>
      </div>
    </div>
  );
}
