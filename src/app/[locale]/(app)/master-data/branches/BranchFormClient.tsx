'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
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

import { Breadcrumb } from '@/components/shared/Breadcrumb';

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
}

export function BranchFormClient({ id, createTitle, editTitle, locale }: Props & { locale: string }) {
  const t = useTranslations('masterData.common');
  const tb = useTranslations('masterData.branches');
  const router = useRouter();

  const { data } = useMasterDataItem('branches', id, BranchSchema);
  const create = useMasterDataCreate('branches', BranchSchema);
  const update = useMasterDataUpdate('branches', BranchSchema);

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<BranchFormValues>({
    resolver: zodResolver(BranchFormSchema),
    defaultValues: { code: '', name_ar: '', name_en: '', is_active: true },
  });

  const isActive = useWatch({ control, name: 'is_active' });

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
    router.push(`/${locale}/master-data/branches`);
  });

  const isSaving = create.isPending || update.isPending;

  return (
    <div className="space-y-2">
      <div className="px-8 pt-8 max-w-[1000px] mx-auto">
        <Breadcrumb 
          items={[
            { label: t('home'), href: `/${locale}/dashboard` },
            { label: t('master_data') },
            { label: tb('title'), href: `/${locale}/master-data/branches` },
            { label: id ? editTitle : createTitle }
          ]} 
        />
      </div>
      <MasterDataFormLayout
        title={id ? editTitle : createTitle}
        backHref={`/${locale}/master-data/branches`}
        isSaving={isSaving}
        onSubmit={onSubmit}
      >
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="branch-code" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{t('code')}</Label>
            <Input id="branch-code" dir="ltr" {...register('code')} className="h-11 bg-surface-container-highest/20 border-white/5 font-mono uppercase" placeholder="BR-001" />
            {errors.code && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.code.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="branch-name-ar" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{t('name_ar')}</Label>
            <Input id="branch-name-ar" dir="rtl" {...register('name_ar')} className="h-11 bg-surface-container-highest/20 border-white/5 font-bold" placeholder="اسم الفرع" />
            {errors.name_ar && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.name_ar.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="branch-name-en" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{t('name_en')}</Label>
            <Input id="branch-name-en" dir="ltr" {...register('name_en')} className="h-11 bg-surface-container-highest/20 border-white/5 font-bold" placeholder="Branch Name" />
            {errors.name_en && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.name_en.message}</p>}
          </div>

          <div className="flex items-center gap-4 py-4 px-6 bg-surface-container-highest/10 rounded-sm border border-white/5">
            <Switch
              id="branch-is-active"
              checked={isActive}
              onCheckedChange={(v) => setValue('is_active', v)}
            />
            <div className="space-y-0.5">
              <Label htmlFor="branch-is-active" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">{t('is_active')}</Label>
              <p className="text-[9px] text-muted-foreground/40 font-bold uppercase">{isActive ? t('active') : t('inactive')}</p>
            </div>
          </div>
        </div>
      </MasterDataFormLayout>
    </div>
  );
}
