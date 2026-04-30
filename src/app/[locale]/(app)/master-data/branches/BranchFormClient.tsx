'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, ShieldCheck, Globe2, Hash } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import {
  useBranch,
  useCreateBranch,
  useUpdateBranch,
} from '@/features/branches/hooks/useBranches';
import { BranchFormSchema, type BranchFormValues } from '@/types/master-data';

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
  locale: string;
}

export function BranchFormClient({ id, createTitle, editTitle, locale }: Props) {
  const t = useTranslations('common');
  const tb = useTranslations('master_data.branches');
  const router = useRouter();

  const { data } = useBranch(id);
  const create = useCreateBranch();
  const update = useUpdateBranch();

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
    try {
      if (id) {
        await update.mutateAsync({ id, values });
      } else {
        await create.mutateAsync(values);
      }
      router.push(`/${locale}/master-data/branches`);
    } catch (error) {
      // Error handled by mutation hook via toast
    }
  });

  const isSaving = create.isPending || update.isPending;

  return (
    <MasterDataFormLayout
      title={id ? editTitle : createTitle}
      backHref={`/${locale}/master-data/branches`}
      isSaving={isSaving}
      onSubmit={onSubmit}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-[0.08em] text-foreground uppercase">{tb('details_title') || t('details')}</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] mt-0.5">{tb('details_description') || t('details_desc')}</p>
                </div>
              </div>

              {/* Code */}
              <div className="space-y-2 max-w-sm">
                <Label htmlFor="branch-code" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">{t('code')}</Label>
                <Input 
                  id="branch-code" 
                  dir="ltr" 
                  {...register('code')} 
                  className="font-mono font-semibold uppercase tracking-[0.08em] text-status-active" 
                  placeholder="BR-001" 
                />
                {errors.code && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{t(errors.code.message as string)}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Name EN */}
                <div className="space-y-2">
                  <Label htmlFor="branch-name-en" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">{t('name_en')}</Label>
                  <Input 
                    id="branch-name-en" 
                    dir="ltr" 
                    {...register('name_en')} 
                    className="font-semibold" 
                    placeholder="Branch Name" 
                  />
                  {errors.name_en && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{t(errors.name_en.message as string)}</p>}
                </div>

                {/* Name AR */}
                <div className="space-y-2">
                  <Label htmlFor="branch-name-ar" className="text-[10px] font-semibold uppercase tracking-normal text-muted-foreground/70">{t('name_ar')}</Label>
                  <Input 
                    id="branch-name-ar" 
                    dir="rtl" 
                    {...register('name_ar')} 
                    className="font-semibold text-end" 
                    placeholder="اسم الفرع" 
                  />
                  {errors.name_ar && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{t(errors.name_ar.message as string)}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-[0.08em] text-foreground uppercase">{t('status')}</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] mt-0.5">{t('operational_status')}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 group transition-all hover:bg-surface-container-highest/30">
                <div className="space-y-1">
                  <Label htmlFor="branch-is-active" className="text-[10px] font-semibold uppercase tracking-[0.08em] cursor-pointer text-muted-foreground/60">{t('is_active')}</Label>
                  <p className={`text-xs font-semibold uppercase tracking-tight ${isActive ? 'text-status-active' : 'text-status-error'}`}>{isActive ? t('active') : t('inactive')}</p>
                </div>
                <Switch
                  id="branch-is-active"
                  checked={isActive}
                  onCheckedChange={(v) => setValue('is_active', v)}
                  className="data-[state=checked]:bg-status-active"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MasterDataFormLayout>
  );
}
