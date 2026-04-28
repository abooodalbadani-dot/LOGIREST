'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ruler, Hash, Globe2, Activity } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import {
  useMasterDataItem,
  useMasterDataCreate,
  useMasterDataUpdate,
} from '@/features/master-data/hooks/useMasterDataCRUD';
import { UoMSchema, UoMFormSchema, type UoMFormValues } from '@/types/master-data';

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
  locale: string;
}

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
    if (data) {
      reset({ code: data.code, name_ar: data.name_ar, name_en: data.name_en });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (id) {
      await update.mutateAsync({ id, body: values });
    } else {
      await create.mutateAsync(values);
    }
    router.push(`/${locale}/master-data/units-of-measure`);
  });

  const isSaving = create.isPending || update.isPending;

  return (
    <MasterDataFormLayout
      title={id ? editTitle : createTitle}
      backHref={`/${locale}/master-data/units-of-measure`}
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
                  <Ruler className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-black uppercase tracking-wider">{tc('basic_info')}</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground/40">{tu('description') || tc('details_desc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {/* Code */}
              <div className="grid gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <Hash className="w-3 h-3 text-cyan-500/50" />
                  <Label htmlFor="uom-code" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('code')}</Label>
                </div>
                <Input 
                  id="uom-code" 
                  dir="ltr" 
                  {...register('code')} 
                  className="h-12 bg-surface-container-highest/30 border-none rounded-sm font-mono uppercase text-sm tracking-widest focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all text-cyan-400 font-black" 
                  placeholder="UNIT-01" 
                />
                {errors.code && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.code.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Name AR */}
                <div className="grid gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe2 className="w-3 h-3 text-cyan-500/50" />
                    <Label htmlFor="uom-name-ar" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('name_ar')}</Label>
                  </div>
                  <Input 
                    id="uom-name-ar" 
                    dir="rtl" 
                    {...register('name_ar')} 
                    className="h-12 bg-surface-container-highest/30 border-none rounded-sm font-bold text-base focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all" 
                    placeholder="اسم الوحدة" 
                  />
                  {errors.name_ar && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.name_ar.message}</p>}
                </div>

                {/* Name EN */}
                <div className="grid gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe2 className="w-3 h-3 text-cyan-500/50" />
                    <Label htmlFor="uom-name-en" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('name_en')}</Label>
                  </div>
                  <Input 
                    id="uom-name-en" 
                    dir="ltr" 
                    {...register('name_en')} 
                    className="h-12 bg-surface-container-highest/30 border-none rounded-sm font-bold text-base focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all" 
                    placeholder="Unit Name" 
                  />
                  {errors.name_en && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.name_en.message}</p>}
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
                <div className="w-8 h-8 rounded-sm bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <CardTitle className="text-xs font-black uppercase tracking-wider">{tu('precision') || tc('details')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="p-4 bg-emerald-500/5 rounded-sm border border-emerald-500/10 border-dashed">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">{tc('precision')}</h3>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium leading-relaxed">
                  {tu('precision_description')}
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-container-highest/10 rounded-sm border border-surface-variant/5">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{tc('status')}</span>
                  <p className="text-[9px] text-emerald-400 font-bold uppercase">{tc('active')}</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MasterDataFormLayout>
  );
}
