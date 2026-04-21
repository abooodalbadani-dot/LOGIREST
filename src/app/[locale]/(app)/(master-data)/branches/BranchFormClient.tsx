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
import {
  useMasterDataItem,
  useMasterDataCreate,
  useMasterDataUpdate,
} from '@/features/master-data/hooks/useMasterDataCRUD';
import { BranchSchema, BranchFormSchema, type BranchFormValues } from '@/types/master-data';

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
}

export function BranchFormClient({ id, createTitle, editTitle }: Props) {
  const t = useTranslations('masterData.common');
  const router = useRouter();

  const { data } = useMasterDataItem('branches', id, BranchSchema);
  const create = useMasterDataCreate('branches', BranchSchema);
  const update = useMasterDataUpdate('branches', BranchSchema);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BranchFormValues>({
    resolver: zodResolver(BranchFormSchema),
    defaultValues: { code: '', name_ar: '', name_en: '', is_active: true },
  });

  useEffect(() => {
    if (data) {
      reset({ code: data.code, name_ar: data.name_ar, name_en: data.name_en, is_active: data.is_active });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (id) {
      await update.mutateAsync({ id, body: values });
    } else {
      await create.mutateAsync(values);
    }
    router.push('../branches');
  });

  const isSaving = create.isPending || update.isPending;

  return (
    <MasterDataFormLayout
      title={id ? editTitle : createTitle}
      backHref="../branches"
      isSaving={isSaving}
      onSubmit={onSubmit}
    >
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="branch-code">{t('code')}</Label>
          <Input id="branch-code" dir="ltr" {...register('code')} className="uppercase" />
          {errors.code && <p className="text-xs text-red-400">{errors.code.message}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="branch-name-ar">{t('name_ar')}</Label>
          <Input id="branch-name-ar" dir="rtl" {...register('name_ar')} />
          {errors.name_ar && <p className="text-xs text-red-400">{errors.name_ar.message}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="branch-name-en">{t('name_en')}</Label>
          <Input id="branch-name-en" dir="ltr" {...register('name_en')} />
          {errors.name_en && <p className="text-xs text-red-400">{errors.name_en.message}</p>}
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="branch-is-active"
            checked={watch('is_active')}
            onCheckedChange={(v) => setValue('is_active', v)}
          />
          <Label htmlFor="branch-is-active">{t('is_active')}</Label>
        </div>
      </div>
    </MasterDataFormLayout>
  );
}
