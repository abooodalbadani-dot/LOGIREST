'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { useMasterDataItem, useMasterDataCreate, useMasterDataUpdate } from '@/features/master-data/hooks/useMasterDataCRUD';
import { UoMSchema, UoMFormSchema, type UoMFormValues } from '@/types/master-data';

interface Props { id: string | null; createTitle: string; editTitle: string; }

export function UoMFormClient({ id, createTitle, editTitle }: Props) {
  const t = useTranslations('masterData.common');
  const router = useRouter();

  const { data } = useMasterDataItem('units-of-measure', id, UoMSchema);
  const create = useMasterDataCreate('units-of-measure', UoMSchema);
  const update = useMasterDataUpdate('units-of-measure', UoMSchema);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UoMFormValues>({
    resolver: zodResolver(UoMFormSchema),
    defaultValues: { code: '', name_ar: '', name_en: '' },
  });

  useEffect(() => {
    if (data) reset({ code: data.code, name_ar: data.name_ar, name_en: data.name_en });
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (id) await update.mutateAsync({ id, body: values });
    else await create.mutateAsync(values);
    router.push('../units-of-measure');
  });

  return (
    <MasterDataFormLayout title={id ? editTitle : createTitle} backHref="../units-of-measure"
      isSaving={create.isPending || update.isPending} onSubmit={onSubmit}>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="uom-code">{t('code')}</Label>
          <Input id="uom-code" dir="ltr" {...register('code')} />
          {errors.code && <p className="text-xs text-red-400">{errors.code.message}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="uom-name-ar">{t('name_ar')}</Label>
          <Input id="uom-name-ar" dir="rtl" {...register('name_ar')} />
          {errors.name_ar && <p className="text-xs text-red-400">{errors.name_ar.message}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="uom-name-en">{t('name_en')}</Label>
          <Input id="uom-name-en" dir="ltr" {...register('name_en')} />
          {errors.name_en && <p className="text-xs text-red-400">{errors.name_en.message}</p>}
        </div>
      </div>
    </MasterDataFormLayout>
  );
}
