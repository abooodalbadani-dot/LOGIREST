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
  useMasterDataItem, useMasterDataCreate, useMasterDataUpdate, useMasterDataList,
} from '@/features/master-data/hooks/useMasterDataCRUD';
import { DepartmentSchema, DepartmentFormSchema, BranchSchema, type DepartmentFormValues } from '@/types/master-data';

interface Props { id: string | null; createTitle: string; editTitle: string; }

export function DepartmentFormClient({ id, createTitle, editTitle }: Props) {
  const t = useTranslations('masterData.common');
  const td = useTranslations('masterData.departments');
  const router = useRouter();

  const { data } = useMasterDataItem('departments', id, DepartmentSchema);
  const { data: branches } = useMasterDataList('branches', BranchSchema);
  const create = useMasterDataCreate('departments', DepartmentSchema);
  const update = useMasterDataUpdate('departments', DepartmentSchema);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<DepartmentFormValues>({
      resolver: zodResolver(DepartmentFormSchema),
      defaultValues: { branch_id: '', code: '', name_ar: '', name_en: '', is_active: true },
    });

  useEffect(() => {
    if (data) reset({ branch_id: data.branch_id, code: data.code, name_ar: data.name_ar, name_en: data.name_en, is_active: data.is_active });
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (id) await update.mutateAsync({ id, body: values });
    else await create.mutateAsync(values);
    router.push('../departments');
  });

  return (
    <MasterDataFormLayout title={id ? editTitle : createTitle} backHref="../departments"
      isSaving={create.isPending || update.isPending} onSubmit={onSubmit}>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="dep-branch">{td('branch')}</Label>
          <select id="dep-branch" {...register('branch_id')}
            className="px-3 py-2 bg-surface-2 border border-surface-3 rounded w-full">
            <option value="">—</option>
            {branches?.data?.map((b) => (
              <option key={b.id} value={b.id}>{b.name_ar} / {b.name_en}</option>
            ))}
          </select>
          {errors.branch_id && <p className="text-xs text-red-400">{errors.branch_id.message}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="dep-code">{t('code')}</Label>
          <Input id="dep-code" dir="ltr" {...register('code')} />
          {errors.code && <p className="text-xs text-red-400">{errors.code.message}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="dep-name-ar">{t('name_ar')}</Label>
          <Input id="dep-name-ar" dir="rtl" {...register('name_ar')} />
          {errors.name_ar && <p className="text-xs text-red-400">{errors.name_ar.message}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="dep-name-en">{t('name_en')}</Label>
          <Input id="dep-name-en" dir="ltr" {...register('name_en')} />
          {errors.name_en && <p className="text-xs text-red-400">{errors.name_en.message}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Switch id="dep-active" checked={watch('is_active')} onCheckedChange={(v) => setValue('is_active', v)} />
          <Label htmlFor="dep-active">{t('is_active')}</Label>
        </div>
      </div>
    </MasterDataFormLayout>
  );
}
