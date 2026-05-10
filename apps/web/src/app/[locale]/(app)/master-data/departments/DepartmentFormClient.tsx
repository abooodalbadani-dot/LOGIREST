'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, ShieldCheck, Landmark, Activity, Warehouse } from 'lucide-react';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';

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
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
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
  viewTitle?: string;
  locale: string;
  isReadOnly?: boolean;
}

export function DepartmentFormClient({ id, createTitle, editTitle, viewTitle, locale, isReadOnly = false }: Props) {
  const t = useTranslations('common');
  const td = useTranslations('master_data.departments');
  
  const { register, handleSubmit, reset, setValue, control, formState: { errors, isDirty, isValid } } = useForm<DepartmentFormValues>({
    resolver: zodResolver(DepartmentFormSchema),
    defaultValues: {
      branch_id: '',
      warehouse_id: '',
      code: '',
      name_ar: '',
      name_en: '',
      is_active: true,
      manager: '',
      cost_center: '',
      version: undefined
    },
    disabled: isReadOnly,
  });

  const { data, isLoading, isError, refetch } = useDepartment(id);
  const { data: branchesData, isLoading: branchesLoading, isError: branchesError, refetch: refetchBranches } = useBranches();
  const branches = branchesData?.data || [];
  const { data: warehousesQuery, isLoading: warehousesLoading, isError: warehousesError, refetch: refetchWarehouses } = useWarehouses();
  const warehouses = warehousesQuery?.data || [];
 
  const create = useCreateDepartment();
  const conflict = useConflictHandler('department', id ?? '');
  const update = useUpdateDepartment({ onConflict: conflict.triggerConflict });

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

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
  cost_center: data.cost_center || '',
  version: data.version
});
 }
 }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (isReadOnly) return;
    
    try {
      if (id) {
        await update.mutateAsync({ id, values });
      } else {
        await create.mutateAsync(values);
      }
      guardedRouter.push('/master-data/departments', { skipGuard: true });
    } catch {
      // Error handled by mutation hooks or conflict handler
    }
  });

  const isSaving = create.isPending || update.isPending;

  if ((id && isLoading && !data) || branchesLoading || warehousesLoading) {
    return <PageSkeleton variant="detail" />;
  }

  if (isError || branchesError || warehousesError) {
    return (
      <ErrorState 
        error={500} 
        onRetry={() => {
          refetch();
          refetchBranches();
          refetchWarehouses();
        }}
      />
    );
  }

  if (id && !data && !isLoading) {
    return <ErrorState error={404} />;
  }

  // Determine the display title
  const displayTitle = id 
    ? (isReadOnly ? (viewTitle || td('view_title')) : editTitle)
    : createTitle;

 return (
    <>
    <MasterDataFormLayout
      title={displayTitle}
      backHref='/master-data/departments'
      isSaving={isSaving} saveDisabled={conflict.saveDisabled}
      onSubmit={onSubmit}
      onCancel={() => guardedRouter.push('/master-data/departments')}
      hideSave={isReadOnly}
      isDirty={isDirty}
      isValid={isValid}
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
 <h3 className="text-body-md font-semibold text-foreground uppercase">{td('title')}</h3>
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{td('description')}</p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {/* Branch Select */}
 <div className="space-y-2">
 <Label htmlFor="dept-branch" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{td('fields.branch')}</Label>
 <Controller
 name="branch_id"
 control={control}
 render={({ field }) => (
                <Select 
                  value={field.value} 
                  onValueChange={(val) => {
                    field.onChange(val);
                    setValue('warehouse_id', ''); // Reset warehouse when branch changes
                  }}
                  disabled={isReadOnly}
                >
 <SelectTrigger id="dept-branch">
  <SelectValue placeholder={t('null_select')} />
 </SelectTrigger>
 <SelectContent>
 {branches.map((b) => (
 <SelectItem key={b.id} value={b.id} className="font-semibold text-label-sm uppercase">
 {b.code} — {b.name_en}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 )}
 />
 {errors.branch_id && <p className="text-label-xs font-semibold text-status-error uppercase">{td(`validation.${errors.branch_id.message}`)}</p>}
 </div>

 {/* Warehouse Select */}
 <div className="space-y-2">
 <Label htmlFor="dept-warehouse" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{td('fields.warehouse')}</Label>
 <Controller
 name="warehouse_id"
 control={control}
 render={({ field }) => (
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange} 
                      disabled={isReadOnly || !selectedBranchId}
                    >
 <SelectTrigger id="dept-warehouse">
  <SelectValue placeholder={t('null_select')} />
 </SelectTrigger>
 <SelectContent>
 {filteredWarehouses.map((w) => (
 <SelectItem key={w.id} value={w.id} className="font-semibold text-label-sm uppercase">
 {w.code} — {w.name_en}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 )}
 />
 {errors.warehouse_id && <p className="text-label-xs font-semibold text-status-error uppercase">{td(`validation.${errors.warehouse_id.message}`)}</p>}
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {/* Code */}
 <div className="space-y-2">
 <Label htmlFor="dept-code" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{td('fields.code')}</Label>
                <Input 
                  id="dept-code" 
                  dir="ltr" 
                  {...register('code')} 
                  disabled={isReadOnly}
                  className="font-mono font-semibold uppercase text-status-active" 
                  placeholder={td('placeholders.code')} 
                />
 {errors.code && <p className="text-label-xs font-semibold text-status-error uppercase">{td(`validation.${errors.code.message}`)}</p>}
 </div>

 <div className="grid grid-cols-2 gap-4">
 {/* Name EN */}
 <div className="space-y-2">
 <Label htmlFor="dept-name-en" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{td('fields.name_en')}</Label>
                  <Input 
                    id="dept-name-en" 
                    dir="ltr" 
                    {...register('name_en')} 
                    disabled={isReadOnly}
                    className="font-semibold" 
                  />
 {errors.name_en && <p className="text-label-xs font-semibold text-status-error uppercase">{td(`validation.${errors.name_en.message}`)}</p>}
 </div>

 {/* Name AR */}
 <div className="space-y-2">
 <Label htmlFor="dept-name-ar" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{td('fields.name_ar')}</Label>
                  <Input 
                    id="dept-name-ar" 
                    dir="rtl" 
                    {...register('name_ar')} 
                    disabled={isReadOnly}
                    className="font-semibold text-end" 
                  />
 {errors.name_ar && <p className="text-label-xs font-semibold text-status-error uppercase">{td(`validation.${errors.name_ar.message}`)}</p>}
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
 <h3 className="text-body-md font-semibold text-foreground uppercase">{t('operational_details')}</h3>
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{t('operational_status')}</p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {/* Manager */}
 <div className="space-y-2">
 <Label htmlFor="dept-manager" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{td('fields.manager')}</Label>
                <Input 
                  id="dept-manager" 
                  {...register('manager')} 
                  disabled={isReadOnly}
                  className="font-semibold" 
                />
 </div>

 {/* Cost Center */}
 <div className="space-y-2">
 <Label htmlFor="dept-cost-center" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{td('fields.cost_center')}</Label>
                <Input 
                  id="dept-cost-center" 
                  dir="ltr"
                  {...register('cost_center')} 
                  disabled={isReadOnly}
                  className="font-mono font-semibold uppercase text-tertiary" 
                  placeholder={td('placeholders.cost_center')} 
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
 <h3 className="text-body-md font-semibold text-foreground uppercase">{t('status')}</h3>
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{t('operational_status')}</p>
 </div>
 </div>

 <div className="flex items-center justify-between p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 group transition-all hover:bg-surface-container-highest/30">
 <div className="space-y-1">
 <Label htmlFor="dept-is-active" className="text-label-xs font-semibold uppercase cursor-pointer text-muted-foreground/60">{td('fields.is_active')}</Label>
 <p className={`text-label-sm font-semibold uppercase ${isActive ? 'text-status-active' : 'text-status-error'}`}>{isActive ? t('active') : t('inactive')}</p>
 </div>
                <Switch
                  id="dept-is-active"
                  checked={isActive}
                  onCheckedChange={(v) => setValue('is_active', v)}
                  disabled={isReadOnly}
                  className="data-[state=checked]:bg-status-active"
                />
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
</MasterDataFormLayout>

      <ConflictDialog
        open={conflict.open}
        onReload={conflict.handleReload}
        onClose={conflict.handleClose}
      />
    </>
  );
}
