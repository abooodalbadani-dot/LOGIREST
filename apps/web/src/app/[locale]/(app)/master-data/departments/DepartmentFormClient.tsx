'use client';

import { useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useForm, useWatch, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, ShieldCheck } from 'lucide-react';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { useAbortController } from '@/hooks/useAbortController';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { useState } from 'react';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOperationalScope } from '@/hooks/useOperationalScope';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { Card, CardContent } from '@/components/ui/card';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import {
 useDepartment,
 useCreateDepartment,
 useUpdateDepartment,
 useDeleteDepartment,
} from '@/features/departments/hooks/useDepartments';
import { useBranches } from '@/features/branches/hooks/useBranches';
import { DepartmentFormSchema, type DepartmentFormValues } from '@/types/master-data';

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
  viewTitle?: string;
  isReadOnly?: boolean;
}

export function DepartmentFormClient({ id, createTitle, editTitle, viewTitle, isReadOnly = false }: Props) {
  const t = useTranslations('common');
  const td = useTranslations('master_data.departments');
  const tv = useTranslations();
  const locale = useLocale();
  const abortController = useAbortController();
  const { branchId: activeBranchId } = useOperationalScope();
  
  const { register, handleSubmit, reset, setValue, control, formState: { errors, isDirty, isValid } } = useForm<DepartmentFormValues>({
    resolver: zodResolver(DepartmentFormSchema),
    defaultValues: {
      branchId: activeBranchId || '',
      name: '',
      isActive: true,
      version: undefined
    },
    disabled: isReadOnly,
  });
 
  const { data, isLoading, isError, refetch } = useDepartment(id);
  const { data: branchesData, isLoading: branchesLoading, isError: branchesError, refetch: refetchBranches } = useBranches();

  const branches = branchesData?.data || [];

  const create = useCreateDepartment();
  const conflict = useConflictHandler('department', id ?? '');
  const update = useUpdateDepartment({ onConflict: conflict.triggerConflict });
  const deleteDept = useDeleteDepartment();
  const { playSound } = useAudioFeedback();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  // Sync form with data when it loads
  useEffect(() => {
    if (data) {
      reset(data);
    }
  }, [data, reset]);

  // Sync defaults with active scopes in create mode
  useEffect(() => {
    if (!id && activeBranchId) {
      setValue('branchId', activeBranchId, { shouldDirty: false, shouldValidate: true });
    }
  }, [id, activeBranchId, setValue]);

  const isActive = useWatch({ control, name: 'isActive' });

  const branchItems = useMemo(() => {
    return branches.map((b) => ({
      id: b.id,
      name: `${b.code} — ${b.name || ''}`,
    }));
  }, [branches, locale]);

  const onValid = (values: DepartmentFormValues) => {
    if (isReadOnly) return;
    
    const payload = {
      branchId: values.branchId,
      name: values.name,
      isActive: values.isActive ?? true,
    };

    if (id) {
      update.mutate(
        { 
          id, 
          values: {
            ...payload,
            version: values.version || undefined,
          },
          signal: abortController.signal 
        },
        {
          onSuccess: () => {
            toast.success(td('updated_success') || 'Department updated successfully');
            reset(values);
            guardedRouter.push('/master-data/departments', { skipGuard: true });
          },
          onError: (error) => {
            console.error('Update failed:', error);
          }
        }
      );
    } else {
      create.mutate(
        { 
          ...payload, 
          signal: abortController.signal 
        },
        {
          onSuccess: () => {
            toast.success(td('created_success') || 'Department created successfully');
            reset(values);
            guardedRouter.push('/master-data/departments', { skipGuard: true });
          },
          onError: (error) => {
            console.error('Create failed:', error);
          }
        }
      );
    }
  };

  const onInvalid = (validationErrors: FieldErrors<DepartmentFormValues>) => {
    console.error('Form Validation Errors:', validationErrors);
    toast.error("يرجى تعبئة جميع الحقول المطلوبة / Please fill in all required fields", {
      duration: 5000,
    });
  };

  const onSubmit = handleSubmit(onValid, onInvalid);

  const handleDelete = () => {
    if (!id) return;
    deleteDept.mutate(
      { id, signal: abortController.signal },
      {
        onSuccess: () => {
          toast.success(td('deleted_success') || 'Department deleted successfully');
          guardedRouter.push('/master-data/departments', { skipGuard: true });
        },
        onError: (error) => {
          console.error('Delete failed:', error);
          setShowDeleteConfirm(false);
        }
      }
    );
  };

  const isSaving = create.isPending || update.isPending || deleteDept.isPending;

  if ((id && isLoading && !data) || branchesLoading) {
    return <PageSkeleton variant="detail" />;
  }

  if (isError || branchesError) {
    return (
      <ErrorState 
        error={500} 
        onRetry={() => {
          refetch();
          refetchBranches();
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
      onCancel={() => guardedRouter.push('/master-data/departments', { skipGuard: true })}
      hideSave={isReadOnly}
      isDirty={isDirty}
      isValid={isValid}
      resource="master_data_departments"
      saveAction={id ? 'edit' : 'create'}
      headerActions={
        id && !isReadOnly && (
          <PermissionGate action="delete" resource="master_data_departments">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-status-error hover:text-status-error hover:bg-status-error/10 rounded-full w-10 h-10 transition-all duration-200"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSaving}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </PermissionGate>
        )
      }
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
                    name="branchId"
                    control={control}
                    render={({ field }) => (
                      <SmartCombobox
                        disabled={isReadOnly}
                        value={field.value ?? ''}
                        onSelect={(item) => field.onChange(item.id)}
                        items={branchItems}
                        placeholder={t('null_select')}
                        className="w-full bg-surface-container-high/40 hover:bg-surface-container-high transition-colors text-label-xs font-bold"
                      />
                    )}
                  />
                  {errors.branchId && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.branchId.message as never)}</p>}
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="dept-name" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{td('fields.name')}</Label>
                  <Input 
                    id="dept-name" 
                    dir="ltr" 
                    {...register('name')} 
                    disabled={isReadOnly}
                    className="font-semibold" 
                  />
                  {errors.name && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.name.message as never)}</p>}
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
 <p className={`text-label-sm font-semibold uppercase ${(isActive ?? true) ? 'text-status-active' : 'text-status-error'}`}>{ (isActive ?? true) ? t('active') : t('inactive')}</p>
 </div>
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <Switch
                      id="dept-is-active"
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                      disabled={isReadOnly}
                      className="data-[state=checked]:bg-status-active"
                    />
                  )}
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

      <PostConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title={td('delete_confirm_title')}
        description={td('delete_confirm_desc')}
        isLoading={deleteDept.isPending}
        variant="destructive"
      />
    </>
  );
}
