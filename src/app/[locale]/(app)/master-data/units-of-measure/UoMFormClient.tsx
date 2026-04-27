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
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Ruler, Info, Activity } from 'lucide-react';

interface Props { id: string | null; createTitle: string; editTitle: string; locale: string; }

export function UoMFormClient({ id, createTitle, editTitle, locale }: Props) {
  const tc = useTranslations('masterData.common');
  const tu = useTranslations('masterData.uom');
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
    router.push(`/${locale}/master-data/units-of-measure`);
  });

  const breadcrumbs = [
    { label: tc('home'), href: `/${locale}` },
    { label: tc('master_data'), href: `/${locale}/master-data` },
    { label: tu('title'), href: `/${locale}/master-data/units-of-measure` },
    { label: id ? editTitle : createTitle }
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Breadcrumb items={breadcrumbs} />

      <MasterDataFormLayout 
        title={id ? editTitle : createTitle} 
        backHref={`/${locale}/master-data/units-of-measure`}
        isSaving={create.isPending || update.isPending} 
        onSubmit={onSubmit}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden border-l-2 border-l-cyan-500/50 shadow-2xl">
              <CardHeader className="pb-4 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 rounded-sm">
                    <Info className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground">{tc('basic_info')}</CardTitle>
                    <CardDescription className="text-[10px] text-muted-foreground/60 uppercase tracking-tighter mt-0.5">{tu('description')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-8 space-y-8">
                <div className="grid gap-2">
                  <Label htmlFor="uom-code" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('code')}</Label>
                  <div className="relative group">
                    <Input 
                      id="uom-code" 
                      dir="ltr" 
                      {...register('code')} 
                      className="bg-surface-container-highest/30 border-none h-12 font-mono text-cyan-500 font-black tracking-widest uppercase ps-4 transition-all focus:bg-surface-container-highest/50" 
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 opacity-20 group-focus-within:opacity-100 transition-opacity">
                      <Ruler className="w-4 h-4 text-cyan-400" />
                    </div>
                  </div>
                  {errors.code && <p className="text-[10px] font-bold text-red-400 uppercase tracking-tighter mt-1">{errors.code.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="grid gap-2">
                    <Label htmlFor="uom-name-en" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('name_en')}</Label>
                    <Input 
                      id="uom-name-en" 
                      dir="ltr" 
                      {...register('name_en')} 
                      className="bg-surface-container-highest/30 border-none h-12 font-bold text-xs transition-all focus:bg-surface-container-highest/50" 
                    />
                    {errors.name_en && <p className="text-[10px] font-bold text-red-400 uppercase tracking-tighter mt-1">{errors.name_en.message}</p>}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="uom-name-ar" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('name_ar')}</Label>
                    <Input 
                      id="uom-name-ar" 
                      dir="rtl" 
                      {...register('name_ar')} 
                      className="bg-surface-container-highest/30 border-none h-12 font-bold text-xs transition-all focus:bg-surface-container-highest/50" 
                    />
                    {errors.name_ar && <p className="text-[10px] font-bold text-red-400 uppercase tracking-tighter mt-1">{errors.name_ar.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden shadow-xl">
              <CardHeader className="pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground">{tu('precision')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="p-4 bg-emerald-500/5 rounded-sm border border-emerald-500/10 border-dashed">
                  <p className="text-[10px] text-emerald-400/80 font-medium leading-relaxed italic">
                    Standard metrics for inventory precision and conversion accuracy across all supply chain nodes.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden shadow-xl">
              <CardHeader className="pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground">{tu('registry_sync')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center px-4 py-3 bg-surface-container-highest/20 rounded-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Status</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-sm">Active</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-surface-container-highest/20 rounded-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Compliance</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-sm">100%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MasterDataFormLayout>
    </div>
  );
}
