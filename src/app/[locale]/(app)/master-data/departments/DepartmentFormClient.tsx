'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, ShieldCheck, Hash, Globe2, User, Landmark, Activity } from 'lucide-react';

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
import { DepartmentSchema, DepartmentFormSchema, type DepartmentFormValues } from '@/types/master-data';

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
  locale: string;
}

export function DepartmentFormClient({ id, createTitle, editTitle, locale }: Props) {
  const tc = useTranslations('masterData.common');
  const router = useRouter();

  const { data } = useMasterDataItem('departments', id, DepartmentSchema);
  const create = useMasterDataCreate('departments', DepartmentSchema);
  const update = useMasterDataUpdate('departments', DepartmentSchema);

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<DepartmentFormValues>({
    resolver: zodResolver(DepartmentFormSchema),
    defaultValues: {
      code: '',
      name_ar: '',
      name_en: '',
      is_active: true,
      manager: '',
      cost_center: ''
    },
  });

  const isActive = useWatch({ control, name: 'is_active' });

  useEffect(() => {
    if (data) {
      reset({
        code: data.code,
        name_ar: data.name_ar,
        name_en: data.name_en,
        is_active: data.is_active,
        manager: data.manager || '',
        cost_center: data.cost_center || ''
      });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (id) {
      await update.mutateAsync({ id, body: values });
    } else {
      await create.mutateAsync(values);
    }
    router.push(`/${locale}/master-data/departments`);
  });

  const isSaving = create.isPending || update.isPending;

  return (
    <MasterDataFormLayout
      title={id ? editTitle : createTitle}
      backHref={`/${locale}/master-data/departments`}
      isSaving={isSaving}
      onSubmit={onSubmit}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Basic Info */}
          <Card className="bg-surface-container-low border-none rounded-sm shadow-xl shadow-black/20 overflow-hidden">
            <CardHeader className="border-b border-surface-variant/5 bg-surface-container-low/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <Briefcase className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-black uppercase tracking-wider">{tc('basic_info')}</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground/40">{tc('basic_info_desc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {/* Code */}
              <div className="grid gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <Hash className="w-3 h-3 text-cyan-500/50" />
                  <Label htmlFor="dept-code" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('code')}</Label>
                </div>
                <Input 
                  id="dept-code" 
                  dir="ltr" 
                  {...register('code')} 
                  className="h-12 bg-surface-container-highest/30 border-none rounded-sm font-mono uppercase text-sm tracking-widest focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all" 
                  placeholder="DEPT-01" 
                />
                {errors.code && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.code.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Name AR */}
                <div className="grid gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe2 className="w-3 h-3 text-cyan-500/50" />
                    <Label htmlFor="dept-name-ar" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('name_ar')}</Label>
                  </div>
                  <Input 
                    id="dept-name-ar" 
                    dir="rtl" 
                    {...register('name_ar')} 
                    className="h-12 bg-surface-container-highest/30 border-none rounded-sm font-bold text-base focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all" 
                    placeholder="اسم القسم" 
                  />
                  {errors.name_ar && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.name_ar.message}</p>}
                </div>

                {/* Name EN */}
                <div className="grid gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe2 className="w-3 h-3 text-cyan-500/50" />
                    <Label htmlFor="dept-name-en" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('name_en')}</Label>
                  </div>
                  <Input 
                    id="dept-name-en" 
                    dir="ltr" 
                    {...register('name_en')} 
                    className="h-12 bg-surface-container-highest/30 border-none rounded-sm font-bold text-base focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all" 
                    placeholder="Department Name" 
                  />
                  {errors.name_en && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.name_en.message}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section: Operational Details */}
          <Card className="bg-surface-container-low border-none rounded-sm shadow-xl shadow-black/20 overflow-hidden">
            <CardHeader className="border-b border-surface-variant/5 bg-surface-container-low/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Landmark className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-black uppercase tracking-wider">{tc('operational_details')}</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground/40">{tc('operational_details_desc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Manager */}
                <div className="grid gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3 h-3 text-amber-500/50" />
                    <Label htmlFor="dept-manager" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('manager')}</Label>
                  </div>
                  <Input 
                    id="dept-manager" 
                    {...register('manager')} 
                    className="h-12 bg-surface-container-highest/30 border-none rounded-sm font-bold text-sm focus-visible:ring-1 focus-visible:ring-amber-500/50 transition-all" 
                    placeholder="Manager Name" 
                  />
                </div>

                {/* Cost Center */}
                <div className="grid gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Landmark className="w-3 h-3 text-amber-500/50" />
                    <Label htmlFor="dept-cost-center" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('cost_center')}</Label>
                  </div>
                  <Input 
                    id="dept-cost-center" 
                    dir="ltr"
                    {...register('cost_center')} 
                    className="h-12 bg-surface-container-highest/30 border-none rounded-sm font-mono uppercase text-sm tracking-widest focus-visible:ring-1 focus-visible:ring-amber-500/50 transition-all" 
                    placeholder="CC-001" 
                  />
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
                <CardTitle className="text-xs font-black uppercase tracking-wider">{tc('status')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between p-4 bg-surface-container-highest/10 rounded-sm border border-surface-variant/5 group hover:bg-surface-container-highest/20 transition-all">
                <div className="space-y-1">
                  <Label htmlFor="dept-is-active" className="text-[10px] font-black uppercase tracking-widest cursor-pointer group-hover:text-cyan-400 transition-colors">{tc('is_active')}</Label>
                  <p className="text-[9px] text-muted-foreground/40 font-bold uppercase">{isActive ? tc('active') : tc('inactive')}</p>
                </div>
                <Switch
                  id="dept-is-active"
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
