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
import { useMasterDataItem, useMasterDataCreate, useMasterDataUpdate } from '@/features/master-data/hooks/useMasterDataCRUD';
import { DepartmentSchema, DepartmentFormSchema, type DepartmentFormValues } from '@/types/master-data';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, ShieldCheck } from 'lucide-react';

interface Props { id: string | null; createTitle: string; editTitle: string; locale: string; }

export function DepartmentFormClient({ id, createTitle, editTitle, locale }: Props) {
  const tc = useTranslations('masterData.common');
  const router = useRouter();

  const { data } = useMasterDataItem('departments', id, DepartmentSchema);
  const create = useMasterDataCreate('departments', DepartmentSchema);
  const update = useMasterDataUpdate('departments', DepartmentSchema);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<DepartmentFormValues>({
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

  const isActive = watch('is_active');

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
    if (id) await update.mutateAsync({ id, body: values });
    else await create.mutateAsync(values);
    router.push(`/${locale}/master-data/departments`);
  });

  const breadcrumbs = [
    { label: tc('title'), href: `/${locale}/master-data` },
    { label: tc('departments'), href: `/${locale}/master-data/departments` },
    { label: id ? editTitle : createTitle, href: '#' }
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbs} />
      
      <MasterDataFormLayout 
        title={id ? editTitle : createTitle} 
        backHref={`/${locale}/master-data/departments`}
        isSaving={create.isPending || update.isPending} 
        onSubmit={onSubmit}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
              <CardContent className="p-6 space-y-8">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                  <div className="w-10 h-10 rounded-sm bg-cyan-500/10 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">{tc('basic_info')}</h3>
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium">Department identification and naming</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="dept-code" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                      {tc('code')}
                    </Label>
                    <Input 
                      id="dept-code" 
                      dir="ltr" 
                      {...register('code')} 
                      className="bg-surface-container-highest/30 border-none h-12 text-sm font-mono font-bold focus-visible:ring-1 focus-visible:ring-cyan-500/50 uppercase tracking-widest"
                      placeholder="e.g. DEPT-001"
                    />
                    {errors.code && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{errors.code.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dept-name-en" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                      {tc('name_en')}
                    </Label>
                    <Input 
                      id="dept-name-en" 
                      dir="ltr" 
                      {...register('name_en')} 
                      className="bg-surface-container-highest/30 border-none h-12 text-sm font-bold focus-visible:ring-1 focus-visible:ring-cyan-500/50"
                      placeholder="e.g. Human Resources"
                    />
                    {errors.name_en && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{errors.name_en.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dept-name-ar" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                      {tc('name_ar')}
                    </Label>
                    <Input 
                      id="dept-name-ar" 
                      dir="rtl" 
                      {...register('name_ar')} 
                      className="bg-surface-container-highest/30 border-none h-12 text-sm font-bold focus-visible:ring-1 focus-visible:ring-cyan-500/50 text-right"
                      placeholder="مثال: الموارد البشرية"
                    />
                    {errors.name_ar && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{errors.name_ar.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
              <CardContent className="p-6 space-y-8">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                  <div className="w-10 h-10 rounded-sm bg-amber-500/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">{tc('operational_details') || 'Operational Details'}</h3>
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium">Management and financial mapping</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="dept-manager" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                      {tc('manager') || 'Department Manager'}
                    </Label>
                    <Input 
                      id="dept-manager" 
                      {...register('manager')} 
                      className="bg-surface-container-highest/30 border-none h-12 text-sm font-bold focus-visible:ring-1 focus-visible:ring-cyan-500/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dept-cost-center" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                      {tc('cost_center') || 'Cost Center'}
                    </Label>
                    <Input 
                      id="dept-cost-center" 
                      dir="ltr"
                      {...register('cost_center')} 
                      className="bg-surface-container-highest/30 border-none h-12 text-sm font-mono font-bold focus-visible:ring-1 focus-visible:ring-cyan-500/50 uppercase tracking-widest"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500">{tc('status') || 'Lifecycle Status'}</h4>
                  <p className="text-[11px] text-muted-foreground/60 leading-relaxed">Control the visibility and operational availability of this unit.</p>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-surface-container-highest/30 rounded-sm border border-white/5">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">{tc('is_active')}</Label>
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-tight">{isActive ? tc('active_status') : tc('inactive_status')}</p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={(val) => setValue('is_active', val)} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MasterDataFormLayout>
    </div>
  );
}
