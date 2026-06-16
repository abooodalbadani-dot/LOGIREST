'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import {
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCategories,
} from '@/features/categories/hooks/useCategories';
import { CategoryFormSchema, type CategoryFormValues, type Category } from '@/types/master-data';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { toast } from 'sonner';

import { useAbortController } from '@/hooks/useAbortController';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { onFormError } from '@/hooks/useFormError';
import { generateNextCode } from '@/lib/code-generator';

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
  viewTitle: string;
  isReadOnly?: boolean;
}

export function CategoryFormClient({ id, createTitle, editTitle, viewTitle, isReadOnly = false }: Props) {
  const t = useTranslations('common');
  const tc = useTranslations('master_data.categories');
  const abortController = useAbortController();

  const { data, isLoading, isError, isFetched, refetch } = useCategory(id);
  const { data: categoriesData } = useCategories();
  const create = useCreateCategory();
  const conflict = useConflictHandler('category', id ?? '');
  const update = useUpdateCategory({ onConflict: conflict.triggerConflict });
  const deleteMutation = useDeleteCategory();
  const { playSound } = useAudioFeedback();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isAutoPopulated, setIsAutoPopulated] = useState(false);

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isDirty, isValid } } = useForm<CategoryFormValues>({
    resolver: zodResolver(CategoryFormSchema),
    defaultValues: { code: '', name: '', version: undefined },
    disabled: isReadOnly,
  });

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  const codeValue = useWatch({ control, name: 'code' });

  useEffect(() => {
    if (data) reset({ code: data.code, name: data.name, version: data.version });
  }, [data, reset]);

  useEffect(() => {
    if (!id && categoriesData?.data && !codeValue && !isAutoPopulated) {
      const existingCodes = categoriesData.data.map((c: Category) => c.code);
      const nextCode = generateNextCode(existingCodes, 'CAT-', 3);
      setValue('code', nextCode, { shouldDirty: true, shouldValidate: true });
      setIsAutoPopulated(true);
    }
  }, [id, categoriesData, setValue, codeValue, isAutoPopulated]);

  // 1. Loading State
  if (id && isLoading) {
    return <PageSkeleton variant="detail" />;
  }

  // 2. Error State (Server/Network Error)
  if (id && isError) {
    return (
      <ErrorState
        type="server_error"
        onRetry={() => refetch()}
      />
    );
  }

  // 3. Not Found State (Smart 404)
  if (id && isFetched && !data) {
    return (
      <ErrorState
        type="not_found"
        onBack={() => guardedRouter.push('/master-data/categories', { skipGuard: true })}
      />
    );
  }

  const onValid = (values: CategoryFormValues) => {
    if (isReadOnly || data?.isReferenced) return;

    if (id) {
      // Only send editable fields (omit readonly category code, nameAr, and nameEn if referenced)
      const updateValues: Partial<CategoryFormValues> = {
        version: values.version,
      };
      if (!data?.isReferenced) {
        updateValues.name = values.name;
      }
      update.mutate(
        {
          id,
          values: updateValues as CategoryFormValues,
          signal: abortController.signal
        },
        {
          onSuccess: () => {
            reset(values);
            guardedRouter.push('/master-data/categories', { skipGuard: true });
          },
          onError: (error) => {
            console.error('Update failed:', error);
          }
        }
      );
    } else {
      create.mutate(
        {
          values: {
            code: values.code || undefined,
            name: values.name,
          },
          signal: abortController.signal
        },
        {
          onSuccess: () => {
            reset(values);
            guardedRouter.push('/master-data/categories', { skipGuard: true });
          },
          onError: (error) => {
            console.error('Create failed:', error);
          }
        }
      );
    }
  };

  const onInvalid = (errors: FieldErrors<CategoryFormValues>) => {
    console.log('3. [CategoryForm] Validation FAILED (Silent Zod Blocker):', errors);
    onFormError(errors);
  };

  const onSubmit = handleSubmit(onValid, onInvalid);

  const handleDelete = () => {
    if (!id) return;
    deleteMutation.mutate(
      { id, version: data?.version, signal: abortController.signal },
      {
        onSuccess: () => {
          guardedRouter.push('/master-data/categories', { skipGuard: true });
        },
        onError: (error) => {
          console.error('Delete failed:', error);
          setDeleteConfirmOpen(false);
        }
      }
    );
  };

  return (
    <>
      <MasterDataFormLayout
        title={isReadOnly ? viewTitle : (id ? editTitle : createTitle)}
        backHref='/master-data/categories'
        isSaving={create.isPending || update.isPending}
        onSubmit={onSubmit}
        onCancel={() => guardedRouter.push('/master-data/categories')}
        hideSave={isReadOnly || data?.isReferenced === true}
        resource="master_data"
        saveAction={id ? 'edit' : 'create'}
        isDirty={isDirty}
        isValid={isValid}
        headerActions={
          id && (
            <div className="flex gap-4">
              <PermissionGate action="delete" resource="master_data">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={data?.isReferenced === true}
                  className="h-12 w-12 rounded-xl bg-status-error/5 hover:bg-status-error/10 text-status-error border-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title={data?.isReferenced ? tc('errors.delete_linked_items') : t('actions.delete')}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </PermissionGate>

              {isReadOnly && (
                <PermissionGate action="edit" resource="master_data">
                  <Button
                    onClick={() => guardedRouter.push(`/master-data/categories/${id}/edit`)}
                    className="h-12 px-6 bg-operational-cyan text-white hover:bg-operational-cyan/90 font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm shadow-operational-cyan/20"
                  >
                    <Edit3 className="w-4 h-4" />
                    {t('edit')}
                  </Button>
                </PermissionGate>
              )}
            </div>
          )
        }
      >
        <div className="col-span-12 w-full max-w-3xl mx-auto flex flex-col gap-8 p-6 bg-card border border-border rounded-xl mt-6">
          {data?.isReferenced && (
            <div className="p-4 rounded-xl bg-status-error/5 border border-status-error/10 flex items-start gap-3 transition-all">
              <AlertTriangle className="w-5 h-5 text-status-error shrink-0 mt-0.5" />
              <div className="text-start">
                <p className="text-body-sm font-semibold text-status-error">
                  {tc('warnings.referenced_protection')}
                </p>
              </div>
            </div>
          )}

          {/* Basic Info Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <Layers className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{tc('title')}</h3>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Code */}
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="cat-code" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {tc('fields.code')}
                </Label>
                <Input
                  id="cat-code"
                  dir="ltr"
                  {...register('code')}
                  disabled={isReadOnly || data?.isReferenced === true}
                  className="font-mono font-semibold uppercase text-status-active w-full h-10"
                  placeholder={tc('placeholders.code') || 'CAT-001'}
                />
                {errors.code && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.code.message}
                  </p>
                )}
              </div>

              {/* Name Field */}
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="cat-name" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {tc('fields.name') || 'Name'}
                </Label>
                <Input
                  id="cat-name"
                  {...register('name')}
                  readOnly={isReadOnly || data?.isReferenced === true}
                  className={`font-semibold ${data?.isReferenced ? 'bg-surface-container-high/50 cursor-not-allowed border-dashed' : ''}`}
                  placeholder={tc('placeholders.name') || 'Name'}
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </MasterDataFormLayout>
      <ConflictDialog open={conflict.open} onReload={conflict.handleReload} onClose={conflict.handleClose} />

      <PostConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        title={tc('delete_confirm_title')}
        description={tc('delete_confirm_desc')}
        confirmText={t('actions.delete')}
        variant="destructive"
        icon="delete"
      />
    </>
  );
}
