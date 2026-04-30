'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, ShieldCheck, Landmark, Activity, Warehouse } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import {
  useDepartment,
  useCreateDepartment,
  useUpdateDepartment,
} from '@/features/departments/hooks/useDepartments';
import { useBranches } from '@/features/branches/hooks/useBranches';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { DepartmentFormSchema, type DepartmentFormValues } from '@/types/master-data';

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
  locale: string;
}

export function DepartmentFormClient({ id, createTitle, editTitle, locale }: Props) {
  const t = useTranslations('common');
  const td = useTranslations('master_data.departments');
  const router = useRouter();

  const { data } = useDepartment(id);
  const { data: branches = [] } = useBranches();
  const { data: warehousesQuery } = useWarehouses();
  const warehouses = warehousesQuery?.data || [];
  
  const create = useCreateDepartment();
  const update = useUpdateDepartment();

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<DepartmentFormValues>({
    resolver: zodResolver(DepartmentFormSchema),
    defaultValues: {
      branch_id: '',
      warehouse_id: '',
      code: '',
      name_ar: '',
      name_en: '',
      is_active: true,
      manager: '',
      cost_center: ''
    },
  });

  const isActive = useWatch({ control, name: 'is_active' });
  const selectedBranchId = useWatch({ control, name: 'branch_id' });

  // Filter warehouses based on selected branch
  const filteredWarehouses = warehouses.filter(w => !selectedBranchId || w.branch_id === selectedBranchId);

  useEffect(() => {
    if (data) {
      reset({
        branch_id: data.branch_id,
        warehouse_id: data.warehouse_id,
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
    try {
      if (id) {
        await update.mutateAsync({ id, values });
      } else {
        await create.mutateAsync(values);
      }
      router.push(`/${locale}/master-data/departments`);
    } catch (error) {
      // Error handled by mutation hook
    }
  });

  const isSaving = create.isPending || update.isPending;

  return (
    <MasterDataFormLayout
      title={id ? editTitle : createTitle}
      backHref={`/${locale}/master-data/departments`}
      isSaving={isSaving}
      onSubmit={onSubmit}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section: Basic Info */}
          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-[0.08em] text-foreground uppercase">{td('title')}</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] mt-0.5">{td('description')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Branch Select */}
                <div className="space-y-2">
                  <Label htmlFor="dept-branch" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">{td('fields.branch')}</Label>
                  <Controller
                    name="branch_id"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(val) => {
                        field.onChange(val);
                        setValue('warehouse_id', ''); // Reset warehouse when branch changes
                      }}>
                        <SelectTrigger id="dept-branch">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id} className="font-semibold text-xs uppercase tracking-[0.08em]">
                              {b.code} — {b.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.branch_id && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{td(`validation.${errors.branch_id.message}`)}</p>}
                </div>

                {/* Warehouse Select */}
                <div className="space-y-2">
                  <Label htmlFor="dept-warehouse" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">{td('fields.warehouse')}</Label>
                  <Controller
                    name="warehouse_id"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange} disabled={!selectedBranchId}>
                        <SelectTrigger id="dept-warehouse">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredWarehouses.map((w) => (
                            <SelectItem key={w.id} value={w.id} className="font-semibold text-xs uppercase tracking-[0.08em]">
                              {w.code} — {w.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.warehouse_id && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{td(`validation.${errors.warehouse_id.message}`)}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Code */}
                <div className="space-y-2">
                  <Label htmlFor="dept-code" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">{td('fields.code')}</Label>
                  <Input 
                    id="dept-code" 
                    dir="ltr" 
                    {...register('code')} 
                    className="font-mono font-semibold uppercase tracking-[0.08em] text-status-active" 
                    placeholder="DEPT-01" 
                  />
                  {errors.code && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{td(`validation.${errors.code.message}`)}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Name EN */}
                  <div className="space-y-2">
                    <Label htmlFor="dept-name-en" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">{td('fields.name_en')}</Label>
                    <Input 
                      id="dept-name-en" 
                      dir="ltr" 
                      {...register('name_en')} 
                      className="font-semibold" 
                    />
                    {errors.name_en && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{td(`validation.${errors.name_en.message}`)}</p>}
                  </div>

                  {/* Name AR */}
                  <div className="space-y-2">
                    <Label htmlFor="dept-name-ar" className="text-[10px] font-semibold uppercase tracking-normal text-muted-foreground/70">{td('fields.name_ar')}</Label>
                    <Input 
                      id="dept-name-ar" 
                      dir="rtl" 
                      {...register('name_ar')} 
                      className="font-semibold text-end" 
                    />
                    {errors.name_ar && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{td(`validation.${errors.name_ar.message}`)}</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section: Operational Details */}
          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <Landmark className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-[0.08em] text-foreground uppercase">{t('operational_details')}</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] mt-0.5">{t('operational_status')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Manager */}
                <div className="space-y-2">
                  <Label htmlFor="dept-manager" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">{td('fields.manager')}</Label>
                  <Input 
                    id="dept-manager" 
                    {...register('manager')} 
                    className="font-semibold" 
                  />
                </div>

                {/* Cost Center */}
                <div className="space-y-2">
                  <Label htmlFor="dept-cost-center" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">{td('fields.cost_center')}</Label>
                  <Input 
                    id="dept-cost-center" 
                    dir="ltr"
                    {...register('cost_center')} 
                    className="font-mono font-semibold uppercase tracking-[0.08em] text-tertiary" 
                    placeholder="CC-001" 
                  />
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
                  <Label htmlFor="dept-is-active" className="text-[10px] font-semibold uppercase tracking-[0.08em] cursor-pointer text-muted-foreground/60">{td('fields.is_active')}</Label>
                  <p className={`text-xs font-semibold uppercase tracking-tight ${isActive ? 'text-status-active' : 'text-status-error'}`}>{isActive ? t('active') : t('inactive')}</p>
                </div>
                <Switch
                  id="dept-is-active"
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
