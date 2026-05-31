'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import {
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/features/categories/hooks/useCategories';
import { CategoryFormSchema, type CategoryFormValues } from '@/types/master-data';
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
import { useState } from 'react';

import { useAbortController } from '@/hooks/useAbortController';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';

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
  const create = useCreateCategory();
  const conflict = useConflictHandler('category', id ?? '');
  const update = useUpdateCategory({ onConflict: conflict.triggerConflict });
  const deleteMutation = useDeleteCategory();
  const { playSound } = useAudioFeedback();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isDirty, isValid } } = useForm<CategoryFormValues>({
    resolver: zodResolver(CategoryFormSchema),
    defaultValues: { code: '', name_ar: '', name_en: '', version: undefined },
    disabled: isReadOnly,
  });
  
  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);
  
  useEffect(() => {
    if (data) reset({ code: data.code, name_ar: data.name_ar, name_en: data.name_en, version: data.version });
  }, [data, reset]);

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

  const onValid = async (values: CategoryFormValues) => {
    if (isReadOnly || data?.is_referenced) return;
    
    try {
      if (id) {
        // Only send editable fields (omit readonly category code, name_ar, and name_en if referenced)
        const updateValues: Partial<CategoryFormValues> = {
          version: values.version,
        };
        if (!data?.is_referenced) {
          updateValues.name_ar = values.name_ar;
          updateValues.name_en = values.name_en;
        }
        await update.mutateAsync({ id, values: updateValues as CategoryFormValues, signal: abortController.signal });
      } else {
        await create.mutateAsync({ values, signal: abortController.signal });
      }
      reset(values);
      guardedRouter.push('/master-data/categories', { skipGuard: true });
    } catch {
      // Error handled by mutation hooks or conflict handler
    }
  };

  const onInvalid = (errors: any) => {
    console.warn('Category form validation failed:', errors);
    toast.error(t('check_fields') || 'Please check required fields');
  };

  const onSubmit = handleSubmit(onValid, onInvalid);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync({ id, signal: abortController.signal });
      guardedRouter.push('/master-data/categories', { skipGuard: true });
    } catch {
      // Error handled by mutation hook
    }
  };

  return (
    <>
    <MasterDataFormLayout
      title={isReadOnly ? viewTitle : (id ? editTitle : createTitle)}
      backHref='/master-data/categories'
      isSaving={create.isPending || update.isPending}
      onSubmit={onSubmit}
      onCancel={() => guardedRouter.push('/master-data/categories')}
      hideSave={isReadOnly || data?.is_referenced === true}
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
                disabled={data?.is_referenced === true}
                className="h-12 w-12 rounded-xl bg-status-error/5 hover:bg-status-error/10 text-status-error border-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title={data?.is_referenced ? tc('errors.delete_linked_items') : t('actions.delete')}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </PermissionGate>

            {isReadOnly && (
              <PermissionGate action="edit" resource="master_data">
                <Button 
                  onClick={() => guardedRouter.push(`/master-data/categories/${id}/edit`)}
                  className="h-12 px-6 bg-operational-cyan text-white hover:bg-operational-cyan/90 font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-operational-cyan/20"
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
      <div className="space-y-8">
        {data?.is_referenced && (
          <div className="p-4 rounded-xl bg-status-error/5 border border-status-error/10 flex items-start gap-3 transition-all">
            <AlertTriangle className="w-5 h-5 text-status-error shrink-0 mt-0.5" />
            <div>
              <p className="text-body-sm font-semibold text-status-error">
                {tc('warnings.referenced_protection')}
              </p>
            </div>
          </div>
        )}

        <Card className="bg-surface-container-low border-none overflow-hidden">
          <CardContent className="p-8 space-y-8">
            {/* Section Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
              <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-tertiary" />
              </div>
              <div>
                <h3 className="text-body-md font-semibold text-foreground uppercase">{tc('title')}</h3>
                <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">
                  {tc('description')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Category Code (Read-Only System Generated) */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="cat-code" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                  {tc('fields.code')}
                </Label>
                <Input
                  id="cat-code"
                  dir="ltr"
                  value={id ? (data?.code || '') : tc('fields.code_auto')}
                  readOnly
                  className="font-mono font-bold bg-surface-container-high/50 cursor-not-allowed select-all border-dashed"
                />
                <p className="text-label-xs font-medium text-muted-foreground/50">
                  {tc('fields.code_hint')}
                </p>
              </div>

              {/* Name EN */}
              <div className="space-y-2">
                <Label htmlFor="cat-name-en" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                  {tc('fields.name_en')}
                </Label>
                <Input
                  id="cat-name-en"
                  dir="ltr"
                  {...register('name_en')}
                  readOnly={isReadOnly || data?.is_referenced === true}
                  className={`font-semibold ${data?.is_referenced ? 'bg-surface-container-high/50 cursor-not-allowed border-dashed' : ''}`}
                  placeholder={tc('placeholders.name_en')}
                />
                {errors.name_en && (
                  <p className="text-label-xs font-semibold text-status-error uppercase">
                    {errors.name_en.message}
                  </p>
                )}
              </div>

              {/* Name AR */}
              <div className="space-y-2">
                <Label htmlFor="cat-name-ar" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                  {tc('fields.name_ar')}
                </Label>
                <Input
                  id="cat-name-ar"
                  dir="rtl"
                  {...register('name_ar')}
                  readOnly={isReadOnly || data?.is_referenced === true}
                  className={`font-semibold text-end ${data?.is_referenced ? 'bg-surface-container-high/50 cursor-not-allowed border-dashed' : ''}`}
                  placeholder={tc('placeholders.name_ar')}
                />
                {errors.name_ar && (
                  <p className="text-label-xs font-semibold text-status-error uppercase">
                    {errors.name_ar.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
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
