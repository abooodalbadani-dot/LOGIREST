'use client';

import { useEffect } from 'react';

import { useTranslations } from 'next-intl';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useForm, useWatch, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, ShieldCheck, Trash2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import {
  useBranch,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
  useBranches,
} from '@/features/branches/hooks/useBranches';
import { BranchFormSchema, type BranchFormValues, type Branch } from '@/types/master-data';
import { toast } from 'sonner';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { onFormError } from '@/hooks/useFormError';

import { useAbortController } from '@/hooks/useAbortController';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { generateNextCode } from '@/lib/code-generator';

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
  viewTitle?: string;
  locale: string;
  isReadOnly?: boolean;
}

export function BranchFormClient({ id, createTitle, editTitle, viewTitle, locale: _locale, isReadOnly = false }: Props) {
  const t = useTranslations('common');
  const tb = useTranslations('master_data.branches');
  const abortController = useAbortController();
  
  const { 
    register, 
    handleSubmit, 
    reset, 
    setValue, 
    control, 
    formState 
  } = useForm<BranchFormValues>({
    resolver: zodResolver(BranchFormSchema),
    disabled: isReadOnly,
    defaultValues: { code: '', name: '', isActive: true, version: undefined },
  });
  const { errors, isDirty, isValid } = formState;

  console.log('Form State - isSubmitting:', formState.isSubmitting, 'isValid:', formState.isValid);

  const { 
    data, 
    isLoading, 
    isError, 
    refetch,
    fetchStatus 
  } = useBranch(id);
  const { data: branchesData } = useBranches();
  const createBranch = useCreateBranch();
  const conflict = useConflictHandler('branch', id ?? '');
  const updateBranch = useUpdateBranch({ onConflict: conflict.triggerConflict });
  const deleteBranch = useDeleteBranch();
  const { playSound } = useAudioFeedback();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAutoPopulated, setIsAutoPopulated] = useState(false);

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  const isActive = useWatch({ control, name: 'isActive' });
  const codeValue = useWatch({ control, name: 'code' });

  useEffect(() => {
    if (data) {
      reset({ code: data.code, name: data.name, isActive: data.isActive, version: data.version });
    }
  }, [data, reset]);

  useEffect(() => {
    if (!id && branchesData?.data && !codeValue && !isAutoPopulated) {
      const existingCodes = branchesData.data.map((b: Branch) => b.code);
      const nextCode = generateNextCode(existingCodes, 'BR-', 3);
      setValue('code', nextCode, { shouldDirty: true, shouldValidate: true });
      setIsAutoPopulated(true);
    }
  }, [id, branchesData, setValue, codeValue, isAutoPopulated]);

  const onValid = (values: BranchFormValues) => {
    console.log('3. [BranchForm] Validation PASSED. Data:', values);
    if (isReadOnly) return;
    
    if (id) {
      updateBranch.mutate({ id, values, signal: abortController.signal }, {
        onSuccess: () => {
          toast.success(tb('updated_success'));
          reset(values);
          guardedRouter.push('/master-data/branches', { skipGuard: true });
        },
        onError: (error) => {
          console.error('Update failed:', error);
        }
      });
    } else {
      createBranch.mutate({ ...values, signal: abortController.signal }, {
        onSuccess: () => {
          toast.success(tb('created_success'));
          reset(values);
          guardedRouter.push('/master-data/branches', { skipGuard: true });
        },
        onError: (error) => {
          console.error('Create failed:', error);
        }
      });
    }
  };

  const onInvalid = (errors: FieldErrors<BranchFormValues>) => {
    console.log('3. [BranchForm] Validation FAILED (Silent Zod Blocker):', errors);
    onFormError(errors);
  };

  const onSubmit = handleSubmit(onValid, onInvalid);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteBranch.mutateAsync({ id, signal: abortController.signal });
      guardedRouter.push('/master-data/branches', { skipGuard: true });
    } catch {
      setShowDeleteConfirm(false);
    }
  };

  // Standardized Loading State
  if (id && (isLoading || (fetchStatus === 'fetching' && !data))) {
    return <PageSkeleton variant="detail" />;
  }

  // Standardized Error State (Server Error)
  if (id && isError) {
    return (
      <MasterDataFormLayout 
        title={editTitle} 
        backHref="/master-data/branches"
        onCancel={() => guardedRouter.push('/master-data/branches')}
      >
        <div className="h-[400px] flex items-center justify-center">
          <ErrorState 
            type="server_error"
            onRetry={() => refetch()}
          />
        </div>
      </MasterDataFormLayout>
    );
  }

  // Standardized Not Found State
  if (id && !data && !isLoading) {
    return (
      <MasterDataFormLayout 
        title={editTitle} 
        backHref="/master-data/branches"
        onCancel={() => guardedRouter.push('/master-data/branches')}
      >
        <div className="h-[400px] flex items-center justify-center">
          <ErrorState 
            type="not_found"
            title={tb('errors.not_found_title')}
            description={tb('errors.not_found_description')}
          />
        </div>
      </MasterDataFormLayout>
    );
  }

  const isSaving = createBranch.isPending || updateBranch.isPending || deleteBranch.isPending;

  // Determine the display title
  const displayTitle = id 
    ? (isReadOnly ? (viewTitle || tb('view_title')) : editTitle)
    : createTitle;

  return (
    <>
    <MasterDataFormLayout
      title={displayTitle}
      backHref='/master-data/branches'
      isSaving={isSaving} saveDisabled={conflict.saveDisabled}
      onSubmit={onSubmit}
      onCancel={() => guardedRouter.push('/master-data/branches', { skipGuard: true })}
      hideSave={isReadOnly}
      isDirty={isDirty}
      isValid={isValid}
      resource="master_data_branches"
      saveAction={id ? 'edit' : 'create'}
      headerActions={
        id && !isReadOnly && (
          <PermissionGate action="delete" resource="master_data_branches">
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
          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-body-md font-semibold text-foreground uppercase">{tb('details_title') || t('details')}</h3>
                  <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{tb('details_description') || t('details_desc')}</p>
                </div>
              </div>

              {/* Code */}
              <div className="space-y-2 max-w-md">
                <Label htmlFor="branch-code" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{t('code')}</Label>
                <Controller
                  control={control}
                  name="code"
                  render={({ field }) => (
                    <Input 
                      id="branch-code" 
                      dir="ltr" 
                      {...field} 
                      disabled={isReadOnly}
                      className="font-mono font-semibold uppercase text-status-active" 
                      placeholder={tb('placeholders.code')} 
                    />
                  )}
                />
                {errors.code && <p className="text-label-xs font-semibold text-status-error uppercase">{t(errors.code.message as string)}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Name EN */}
                <div className="space-y-2">
                  <Label htmlFor="branch-name" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{t('name')}</Label>
                  <Controller
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <Input 
                        id="branch-name" 
                        dir="ltr" 
                        {...field} 
                        disabled={isReadOnly}
                        className="font-semibold" 
                        placeholder={tb('placeholders.name')} 
                      />
                    )}
                  />
                  {errors.name && <p className="text-label-xs font-semibold text-status-error uppercase">{t(errors.name.message as string)}</p>}
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
                  <h3 className="text-body-md font-semibold text-foreground uppercase">{t('status_label')}</h3>
                  <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{t('operational_status')}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 group transition-all hover:bg-surface-container-highest/30">
                <div className="space-y-1">
                  <Label htmlFor="branch-is-active" className="text-label-xs font-semibold uppercase cursor-pointer text-muted-foreground/60">{t('is_active')}</Label>
                  <p className={`text-label-sm font-semibold uppercase ${(isActive ?? true) ? 'text-status-active' : 'text-status-error'}`}>{(isActive ?? true) ? t('statuses.active') : t('statuses.inactive')}</p>
                </div>
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <Switch
                      id="branch-is-active"
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
      <ConflictDialog open={conflict.open} onReload={conflict.handleReload} onClose={conflict.handleClose} />

      <PostConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title={tb('delete_confirm_title')}
        description={tb('delete_confirm_desc')}
        isLoading={deleteBranch.isPending}
        variant="destructive"
      />
    </>
  );
}
