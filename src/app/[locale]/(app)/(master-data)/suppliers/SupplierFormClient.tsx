'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import {
  useMasterDataItem, useMasterDataCreate, useMasterDataUpdate, useMasterDataList,
} from '@/features/master-data/hooks/useMasterDataCRUD';
import { SupplierSchema, SupplierFormSchema, CurrencySchema, type SupplierFormValues } from '@/types/master-data';

interface Props { id: string | null; createTitle: string; editTitle: string; }

export function SupplierFormClient({ id, createTitle, editTitle }: Props) {
  const t = useTranslations('masterData.common');
  const ts = useTranslations('masterData.suppliers');
  const router = useRouter();

  const { data } = useMasterDataItem('suppliers', id, SupplierSchema);
  const { data: currencies } = useMasterDataList('currencies', CurrencySchema);
  const create = useMasterDataCreate('suppliers', SupplierSchema);
  const update = useMasterDataUpdate('suppliers', SupplierSchema);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<SupplierFormValues>({
      resolver: zodResolver(SupplierFormSchema),
      defaultValues: { code: '', name_ar: '', name_en: '', currency_id: '', payment_terms: '', is_active: true },
    });

  useEffect(() => {
    if (data) {
      reset({
        code: data.code, name_ar: data.name_ar, name_en: data.name_en,
        currency_id: data.currency_id, payment_terms: data.payment_terms, is_active: data.is_active,
      });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (id) await update.mutateAsync({ id, body: values });
    else await create.mutateAsync(values);
    router.push('../suppliers');
  });

  return (
    <MasterDataFormLayout title={id ? editTitle : createTitle} backHref="../suppliers"
      isSaving={create.isPending || update.isPending} onSubmit={onSubmit}>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="sup-code">{t('code')}</Label>
          <Input id="sup-code" dir="ltr" {...register('code')} />
          {errors.code && <p className="text-xs text-red-400">{errors.code.message}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sup-name-ar">{t('name_ar')}</Label>
          <Input id="sup-name-ar" dir="rtl" {...register('name_ar')} />
          {errors.name_ar && <p className="text-xs text-red-400">{errors.name_ar.message}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sup-name-en">{t('name_en')}</Label>
          <Input id="sup-name-en" dir="ltr" {...register('name_en')} />
          {errors.name_en && <p className="text-xs text-red-400">{errors.name_en.message}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sup-currency">{ts('currency')}</Label>
          <select id="sup-currency" {...register('currency_id')}
            className="px-3 py-2 bg-surface-2 border border-surface-3 rounded w-full">
            <option value="">—</option>
            {currencies?.data?.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {c.name_en}</option>
            ))}
          </select>
          {errors.currency_id && <p className="text-xs text-red-400">{errors.currency_id.message}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sup-terms">{ts('payment_terms')}</Label>
          <Textarea id="sup-terms" rows={2} {...register('payment_terms')} />
        </div>
        <div className="flex items-center gap-3">
          <Switch id="sup-active" checked={watch('is_active')} onCheckedChange={(v) => setValue('is_active', v)} />
          <Label htmlFor="sup-active">{t('is_active')}</Label>
        </div>
      </div>
    </MasterDataFormLayout>
  );
}
