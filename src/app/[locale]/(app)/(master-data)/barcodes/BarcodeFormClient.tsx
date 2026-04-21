'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import {
  useMasterDataItem, useMasterDataCreate, useMasterDataUpdate, useMasterDataList,
} from '@/features/master-data/hooks/useMasterDataCRUD';
import { BarcodeSchema, BarcodeFormSchema, ItemSchema, type BarcodeFormValues } from '@/types/master-data';

interface Props { id: string | null; createTitle: string; editTitle: string; }

export function BarcodeFormClient({ id, createTitle, editTitle }: Props) {
  const t = useTranslations('masterData.common');
  const tb = useTranslations('masterData.barcodes');
  const router = useRouter();

  const { data } = useMasterDataItem('barcodes', id, BarcodeSchema);
  const { data: items } = useMasterDataList('items', ItemSchema);
  const create = useMasterDataCreate('barcodes', BarcodeSchema);
  const update = useMasterDataUpdate('barcodes', BarcodeSchema);

  const { register, handleSubmit, reset, setValue, formState: { errors } } =
    useForm<BarcodeFormValues>({
      resolver: zodResolver(BarcodeFormSchema),
      defaultValues: { item_id: '', barcode: '', default_qty: 1 },
    });

  useEffect(() => {
    if (data) {
      reset({ item_id: data.item_id, barcode: data.barcode, default_qty: data.default_qty });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (id) await update.mutateAsync({ id, body: values });
    else await create.mutateAsync(values);
    router.push('../barcodes');
  });

  return (
    <MasterDataFormLayout title={id ? editTitle : createTitle} backHref="../barcodes"
      isSaving={create.isPending || update.isPending} onSubmit={onSubmit}>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="bc-item">{tb('item')}</Label>
          <select id="bc-item" {...register('item_id')}
            className="px-3 py-2 bg-surface-2 border border-surface-3 rounded w-full">
            <option value="">—</option>
            {items?.data?.map((i) => (
              <option key={i.id} value={i.id}>{i.code} — {i.name_en}</option>
            ))}
          </select>
          {errors.item_id && <p className="text-xs text-red-400">{errors.item_id.message}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="bc-val">{tb('barcode_label')}</Label>
          <ScanInput
            onScan={(val) => setValue('barcode', val, { shouldValidate: true })}
            placeholder={tb('scan_or_type')}
          />
          <input type="hidden" {...register('barcode')} />
          {errors.barcode && <p className="text-xs text-red-400">{errors.barcode.message}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="bc-qty">{tb('default_qty')}</Label>
          <Input id="bc-qty" type="number" dir="ltr" min={1}
            {...register('default_qty', { valueAsNumber: true })} />
          {errors.default_qty && <p className="text-xs text-red-400">{errors.default_qty.message}</p>}
        </div>
      </div>
    </MasterDataFormLayout>
  );
}
