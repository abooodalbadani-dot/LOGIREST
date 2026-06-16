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
        <div className="col-span-12 w-full max-w-3xl mx-auto flex flex-col gap-8 p-6 bg-card border border-border rounded-xl mt-6">
          {/* Basic Info Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <Briefcase className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{td('title')}</h3>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Branch Select */}
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="dept-branch" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{td('fields.branch')}</Label>
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
                {errors.branchId && <p className="text-xs text-red-500 mt-1">{tv(errors.branchId.message as never)}</p>}
              </div>

              {/* Name */}
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="dept-name" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{td('fields.name')}</Label>
                <Input
                  id="dept-name"
                  dir="ltr"
                  {...register('name')}
                  disabled={isReadOnly}
                  className="font-semibold w-full h-10"
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{tv(errors.name.message as never)}</p>}
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <ShieldCheck className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{t('status')}</h3>
            </div>

            <div className="flex flex-row items-center justify-between w-full rounded-lg border border-border p-4 shadow-sm bg-transparent transition-colors hover:bg-muted/30">
              <div className="flex flex-col space-y-1 text-start min-w-0">
                <span className="text-sm font-medium text-text-main dark:text-white">{td('fields.is_active')}</span>
                <span className="text-xs text-muted-foreground dark:text-gray-400">{(isActive ?? true) ? t('active') : t('inactive')}</span>
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
                    activeClassName="bg-status-active"
                  />
                )}
              />
            </div>
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
