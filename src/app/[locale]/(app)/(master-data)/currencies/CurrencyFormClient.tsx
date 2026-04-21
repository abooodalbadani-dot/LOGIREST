'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { useMasterDataItem, useMasterDataCreate, useMasterDataUpdate } from '@/features/master-data/hooks/useMasterDataCRUD';
import { CurrencySchema, CurrencyFormSchema, type CurrencyFormValues } from '@/types/master-data';

interface Props { id: string | null; createTitle: string; editTitle: string; }

export function CurrencyFormClient({ id, createTitle, editTitle }: Props) {
  const t = useTranslations('masterData.common');
  const tc = useTranslations('masterData.currencies');
  const router = useRouter();

  const { data } = useMasterDataItem('currencies', id, CurrencySchema);
  const create = useMasterDataCreate('currencies', CurrencySchema);
  const update = useMasterDataUpdate('currencies', CurrencySchema);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<CurrencyFormValues>({
      resolver: zodResolver(CurrencyFormSchema),
      defaultValues: { code: '', name_ar: '', name_en: '', symbol: '', is_base: false },
    });

  useEffect(() => {
    if (data) {
      reset({ code: data.code, name_ar: data.name_ar, name_en: data.name_en, symbol: data.symbol, is_base: data.is_base });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (id) await update.mutateAsync({ id, body: values });
    else await create.mutateAsync(values);
    router.push('../currencies');
  });

  return (
    <MasterDataFormLayout title={id ? editTitle : createTitle} backHref="../currencies"
      isSaving={create.isPending || update.isPending} onSubmit={onSubmit}>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="cur-code">{t('code')}</Label>
            <Input id="cur-code" dir="ltr" maxLength={3} {...register('code')} className="uppercase" />
            {errors.code && <p className="text-xs text-red-400">{errors.code.message}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cur-symbol">{tc('symbol')}</Label>
            <Input id="cur-symbol" dir="ltr" maxLength={8} {...register('symbol')} />
            {errors.symbol && <p className="text-xs text-red-400">{errors.symbol.message}</p>}
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cur-name-ar">{t('name_ar')}</Label>
          <Input id="cur-name-ar" dir="rtl" {...register('name_ar')} />
          {errors.name_ar && <p className="text-xs text-red-400">{errors.name_ar.message}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cur-name-en">{t('name_en')}</Label>
          <Input id="cur-name-en" dir="ltr" {...register('name_en')} />
          {errors.name_en && <p className="text-xs text-red-400">{errors.name_en.message}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Switch id="cur-base" checked={watch('is_base')} onCheckedChange={(v) => setValue('is_base', v)} />
          <Label htmlFor="cur-base">{tc('is_base')}</Label>
        </div>
      </div>
    </MasterDataFormLayout>
  );
}
