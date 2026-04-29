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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  locale: string;
}

export function BranchFormClient({ id, createTitle, editTitle, locale }: Props) {
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
    <MasterDataFormLayout
      title={id ? editTitle : createTitle}
      backHref={`/${locale}/master-data/branches`}
      isSaving={isSaving}
      onSubmit={onSubmit}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-surface-container-low border-none rounded-sm shadow-xl shadow-black/20 overflow-hidden">
            <CardHeader className="border-b border-surface-variant/5 bg-surface-container-low/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-black uppercase tracking-wider">{tb('details_title') || t('details')}</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground/40">{tb('details_description') || t('details_desc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {/* Code */}
              <div className="grid gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <Hash className="w-3 h-3 text-cyan-500/50" />
                  <Label htmlFor="branch-code" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('code')}</Label>
                </div>
                <Input 
                  id="branch-code" 
                  dir="ltr" 
                  {...register('code')} 
                  className="h-12 bg-surface-container-highest/30 border-none rounded-sm font-mono uppercase text-sm tracking-widest focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all" 
                  placeholder="BR-001" 
                />
                {errors.code && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight ps-1">{t(errors.code.message as string)}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Name AR */}
                <div className="grid gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe2 className="w-3 h-3 text-cyan-500/50" />
                    <Label htmlFor="branch-name-ar" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('name_ar')}</Label>
                  </div>
                  <Input 
                    id="branch-name-ar" 
                    dir="rtl" 
                    {...register('name_ar')} 
                    className="h-12 bg-surface-container-highest/30 border-none rounded-sm font-bold text-base focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all" 
                    placeholder="اسم الفرع" 
                  />
                  {errors.name_ar && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight ps-1">{t(errors.name_ar.message as string)}</p>}
                </div>

                {/* Name EN */}
                <div className="grid gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe2 className="w-3 h-3 text-cyan-500/50" />
                    <Label htmlFor="branch-name-en" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('name_en')}</Label>
                  </div>
                  <Input 
                    id="branch-name-en" 
                    dir="ltr" 
                    {...register('name_en')} 
                    className="h-12 bg-surface-container-highest/30 border-none rounded-sm font-bold text-base focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all" 
                    placeholder="Branch Name" 
                  />
                  {errors.name_en && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight ps-1">{t(errors.name_en.message as string)}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="bg-surface-container-low border-none rounded-sm shadow-xl shadow-black/20 overflow-hidden">
            <CardHeader className="border-b border-surface-variant/5 bg-surface-container-low/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                </div>
                <CardTitle className="text-xs font-black uppercase tracking-wider">{t('status')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between p-4 bg-surface-container-highest/10 rounded-sm border border-surface-variant/5 group hover:bg-surface-container-highest/20 transition-all">
                <div className="space-y-1">
                  <Label htmlFor="branch-is-active" className="text-[10px] font-black uppercase tracking-widest cursor-pointer group-hover:text-cyan-400 transition-colors">{t('is_active')}</Label>
                  <p className="text-[9px] text-muted-foreground/40 font-bold uppercase">{isActive ? t('active') : t('inactive')}</p>
                </div>
                <Switch
                  id="branch-is-active"
                  checked={isActive}
                  onCheckedChange={(v) => setValue('is_active', v)}
                  className="data-[state=checked]:bg-cyan-500"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MasterDataFormLayout>
  );
}
