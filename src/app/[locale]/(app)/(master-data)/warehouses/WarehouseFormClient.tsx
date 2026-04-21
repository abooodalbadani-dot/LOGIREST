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
import {
  WarehouseSchema, WarehouseFormSchema, BranchSchema,
  type WarehouseFormValues,
} from '@/types/master-data';

interface Props { id: string | null; createTitle: string; editTitle: string; }

export function WarehouseFormClient({ id, createTitle, editTitle }: Props) {
  const t = useTranslations('masterData.common');
  const tw = useTranslations('masterData.warehouses');
  const router = useRouter();

  const { data } = useMasterDataItem('warehouses', id, WarehouseSchema);
  const { data: branches } = useMasterDataList('branches', BranchSchema);
  const create = useMasterDataCreate('warehouses', WarehouseSchema);
  const update = useMasterDataUpdate('warehouses', WarehouseSchema);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<WarehouseFormValues>({
      resolver: zodResolver(WarehouseFormSchema),
      defaultValues: { branch_id: '', code: '', name_ar: '', name_en: '', type: 'MAIN', is_active: true },
    });

  useEffect(() => {
    if (data) {
      reset({ branch_id: data.branch_id, code: data.code, name_ar: data.name_ar, name_en: data.name_en, type: data.type, is_active: data.is_active });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (id) await update.mutateAsync({ id, body: values });
    else await create.mutateAsync(values);
    router.push('../warehouses');
  });

  const isSaving = create.isPending || update.isPending;

  return (
    <MasterDataFormLayout title={id ? editTitle : createTitle} backHref="../warehouses" isSaving={isSaving} onSubmit={onSubmit}>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="wh-branch">{tw('branch')}</Label>
          <select
            id="wh-branch"
            {...register('branch_id')}
            className="px-3 py-2 bg-surface-2 border border-surface-3 rounded w-full"
          >
            <option value="">—</option>
            {branches?.data?.map((b) => (
              <option key={b.id} value={b.id}>{b.name_ar} / {b.name_en}</option>
            ))}
          </select>
          {errors.branch_id && <p className="text-xs text-red-400">{errors.branch_id.message}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="wh-code">{t('code')}</Label>
          <Input id="wh-code" dir="ltr" {...register('code')} />
          {errors.code && <p className="text-xs text-red-400">{errors.code.message}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="wh-name-ar">{t('name_ar')}</Label>
          <Input id="wh-name-ar" dir="rtl" {...register('name_ar')} />
          {errors.name_ar && <p className="text-xs text-red-400">{errors.name_ar.message}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="wh-name-en">{t('name_en')}</Label>
          <Input id="wh-name-en" dir="ltr" {...register('name_en')} />
          {errors.name_en && <p className="text-xs text-red-400">{errors.name_en.message}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="wh-type">{tw('type')}</Label>
          <select
            id="wh-type"
            {...register('type')}
            className="px-3 py-2 bg-surface-2 border border-surface-3 rounded w-full"
          >
            {(['MAIN','DRY','COLD','VIRTUAL'] as const).map((ty) => (
              <option key={ty} value={ty}>{tw(`type_${ty.toLowerCase()}` as any)}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <Switch id="wh-active" checked={watch('is_active')} onCheckedChange={(v: boolean) => setValue('is_active', v)} />
          <Label htmlFor="wh-active">{t('is_active')}</Label>
        </div>
      </div>
    </MasterDataFormLayout>
  );
}
