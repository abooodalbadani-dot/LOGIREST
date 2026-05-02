'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ruler, Activity, ShieldCheck } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import {
 useUoM,
 useCreateUoM,
 useUpdateUoM,
} from '@/features/uoms/hooks/useUoMs';
import { UoMFormSchema, type UoMFormValues } from '@/types/master-data';

interface Props {
 id: string | null;
 createTitle: string;
 editTitle: string;
 locale: string;
}

export function UoMFormClient({ id, createTitle, editTitle, locale }: Props) {
 const t = useTranslations('common');
 const tu = useTranslations('master_data.uoms');
 const router = useRouter();

 const { data, isLoading } = useUoM(id);
 const create = useCreateUoM();
 const update = useUpdateUoM();

 const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<UoMFormValues>({
 resolver: zodResolver(UoMFormSchema),
 defaultValues: { code: '', name_ar: '', name_en: '', is_active: true },
 });

 const isActive = useWatch({ control, name: 'is_active' });

 useEffect(() => {
 if (data) {
 reset({ 
 code: data.code, 
 name_ar: data.name_ar, 
 name_en: data.name_en,
 is_active: data.is_active
 });
 }
 }, [data, reset]);

 const onSubmit = handleSubmit(async (values) => {
 try {
 if (id) {
 await update.mutateAsync({ id, values });
 } else {
 await create.mutateAsync(values);
 }
 router.push(`/ ${locale}/master-data/units-of-measure`);
 } catch (error) {
 // Handled in hook
 }
 });

 const isSaving = create.isPending || update.isPending;

 if (id && isLoading) return null;

 return (
 <MasterDataFormLayout
 title={id ? editTitle : createTitle}
 backHref={`/ ${locale}/master-data/units-of-measure`}
 isSaving={isSaving}
 onSubmit={onSubmit}
 >
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <div className="lg:col-span-2 space-y-8">
 <Card className="bg-surface-container-low border-none overflow-hidden">
 <CardContent className="p-8 space-y-8">
 <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
 <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
 <Ruler className="w-5 h-5 text-tertiary" />
 </div>
 <div>
 <h3 className="text-body-md font-semibold text-foreground uppercase">{t('basic_info')}</h3>
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{tu('description')}</p>
 </div>
 </div>

 <div className="space-y-6">
 <div className="space-y-2 max-w-sm">
 <Label htmlFor="uom-code" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{t('code')}</Label>
 <Controller
 name="code"
 control={control}
 render={({ field }) => (
 <Input 
 {...field}
 id="uom-code" 
 dir="ltr" 
 onChange={(e) => field.onChange(e.target.value.toUpperCase())}
 className="font-mono font-semibold uppercase text-status-active" 
 placeholder="UNIT" 
 />
 )}
 />
 {errors.code && <p className="text-label-xs font-semibold text-status-error uppercase">{errors.code.message}</p>}
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-2">
 <Label htmlFor="uom-name-en" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{t('name_en')}</Label>
 <Input 
 id="uom-name-en" 
 dir="ltr" 
 {...register('name_en')} 
 className="font-semibold" 
 placeholder="Unit Name" 
 />
 {errors.name_en && <p className="text-label-xs font-semibold text-status-error uppercase">{errors.name_en.message}</p>}
 </div>

 <div className="space-y-2">
 <Label htmlFor="uom-name-ar" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{t('name_ar')}</Label>
 <Input 
 id="uom-name-ar" 
 dir="rtl" 
 {...register('name_ar')} 
 className="font-semibold text-end" 
 placeholder="اسم الوحدة" 
 />
 {errors.name_ar && <p className="text-label-xs font-semibold text-status-error uppercase">{errors.name_ar.message}</p>}
 </div>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>

 <div className="space-y-8">
 <Card className="bg-surface-container-low border-none overflow-hidden">
 <CardContent className="p-8 space-y-6">
 <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
 <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
 <ShieldCheck className="w-5 h-5 text-tertiary" />
 </div>
 <div>
 <h3 className="text-body-md font-semibold text-foreground uppercase">{t('status')}</h3>
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{t('status')}</p>
 </div>
 </div>

 <div className="flex items-center justify-between p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 group transition-all hover:bg-surface-container-highest/30">
 <div className="space-y-1">
 <Label htmlFor="uom-active" className="text-label-xs font-semibold uppercase cursor-pointer text-muted-foreground/60">{t('is_active')}</Label>
 <p className={`text-label-sm font-semibold uppercase ${isActive ? 'text-status-active' : 'text-status-error'}`}>{isActive ? t('active') : t('inactive')}</p>
 </div>
 <Switch
 id="uom-active"
 checked={isActive}
 onCheckedChange={(v) => setValue('is_active', v)}
 className="data-[state=checked]:bg-status-active"
 />
 </div>

 <div className="p-4 bg-amber-500/5 rounded-md border border-amber-500/10 border-dashed">
 <div className="flex items-center gap-2 mb-2 text-amber-500">
 <Activity className="w-3.5 h-3.5" />
 <span className="text-label-xs font-semibold uppercase">{tu('precision')}</span>
 </div>
 <p className="text-label-xs text-muted-foreground/50 uppercase font-medium leading-relaxed">
 {tu('precision_description')}
 </p>
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 </MasterDataFormLayout>
 );
}
