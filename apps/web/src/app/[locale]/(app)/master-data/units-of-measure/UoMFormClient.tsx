'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, Controller, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ruler, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { FormContainer, FormCard, FormGridArea, FormFooter, FormHeader } from '@/components/layouts/FormLayout';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useUoM, useCreateUoM, useUpdateUoM, useDeleteUoM, useUoMs } from '@/features/uoms/hooks/useUoMs';
import { generateNextCode } from '@/lib/code-generator';
import { UoMFormSchema, type UoMFormValues, type UoM } from '@/types/master-data';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { toast } from 'sonner';

import { useAbortController } from '@/hooks/useAbortController';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { onFormError } from '@/hooks/useFormError';

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
  viewTitle?: string;
  isReadOnly?: boolean;
}

export function UoMFormClient({ id, createTitle, editTitle, viewTitle, isReadOnly = false }: Props) {
  const t = useTranslations('common');
  const tu = useTranslations('master_data.uoms');
  const tv = useTranslations();
  const abortController = useAbortController();

  const { data, isLoading, isError, isFetched, refetch } = useUoM(id);
  const { data: uomsData } = useUoMs();
  const create = useCreateUoM();
  const conflict = useConflictHandler('uom', id ?? '');
  const update = useUpdateUoM({ onConflict: conflict.triggerConflict });
  const deleteUoM = useDeleteUoM();
  const { playSound } = useAudioFeedback();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAutoPopulated, setIsAutoPopulated] = useState(false);

  const { register, handleSubmit, reset, control, setValue, formState: { errors, isDirty, isValid } } = useForm<UoMFormValues>({
    resolver: zodResolver(UoMFormSchema),
    defaultValues: { code: '', name: '', version: undefined },
    disabled: isReadOnly,
  });

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  const codeValue = useWatch({ control, name: 'code' });

  useEffect(() => {
    if (data) {
      reset({
        code: data.code,
        name: data.name,
        version: data.version
      });
    }
  }, [data, reset]);

  useEffect(() => {
    if (!id && uomsData?.data && !codeValue && !isAutoPopulated) {
      const existingCodes = uomsData.data.map((u: UoM) => u.code);
      const nextCode = generateNextCode(existingCodes, 'UOM-', 3);
      setValue('code', nextCode, { shouldDirty: true, shouldValidate: true });
      setIsAutoPopulated(true);
    }
  }, [id, uomsData, setValue, codeValue, isAutoPopulated]);

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
        onBack={() => guardedRouter.push('/master-data/units-of-measure', { skipGuard: true })}
      />
    );
  }

  const onValid = (values: UoMFormValues) => {
    if (isReadOnly) return;

    const payload = {
      code: values.code || undefined,
      name: values.name,
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
            reset(values);
            guardedRouter.push('/master-data/units-of-measure', { skipGuard: true });
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
            reset(values);
            guardedRouter.push('/master-data/units-of-measure', { skipGuard: true });
          },
          onError: (error) => {
            console.error('Create failed:', error);
          }
        }
      );
    }
  };

  const onInvalid = (errors: FieldErrors<UoMFormValues>) => {
    console.log('3. [UoMForm] Validation FAILED (Silent Zod Blocker):', errors);
    onFormError(errors);
  };

  const onSubmit = handleSubmit(onValid, onInvalid);

  const handleDelete = () => {
    if (!id) return;
    deleteUoM.mutate(
      { id, signal: abortController.signal },
      {
        onSuccess: () => {
          guardedRouter.push('/master-data/units-of-measure', { skipGuard: true });
        },
        onError: (error) => {
          console.error('Delete failed:', error);
          setShowDeleteConfirm(false);
        }
      }
    );
  };

  const isSaving = create.isPending || update.isPending || deleteUoM.isPending;

  // Determine the display title
  const displayTitle = id
    ? (isReadOnly ? (viewTitle || tu('view_title')) : editTitle)
    : createTitle;

  return (
    <div className="min-w-0 gap-6 flex-1 fade-in slide-in-from-bottom-4 duration-200 animate-in flex-col flex pb-32 w-full">
      <FormContainer className="max-w-3xl mx-auto mt-6 w-full">
        <FormCard>
          <FormHeader
            title={displayTitle}
            subtitle={tu('description')}
            icon={Ruler}
            backHref="/master-data/units-of-measure"
            actions={
              id && !isReadOnly && (
                <PermissionGate action="delete" resource="master_data_units_of_measure">
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
          />

          <FormGridArea>
            <div className="col-span-12 flex items-center gap-2 pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-body-md font-semibold text-foreground uppercase">{t('basic_info')}</h3>
            </div>

            <div className="col-span-12 md:col-span-6 w-full">
              <Label htmlFor="uom-code" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('code')}</Label>
              <Controller
                name="code"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    id="uom-code"
                    dir="ltr"
                    disabled={isReadOnly}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    className="font-mono font-semibold uppercase text-status-active w-full h-10"
                    placeholder={tu('placeholders.code')}
                  />
                )}
              />
              {errors.code && <p className="text-xs text-red-500 mt-1">{tv(errors.code.message as never)}</p>}
            </div>

            <div className="col-span-12 md:col-span-6 w-full">
              <Label htmlFor="uom-name" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('name') || 'Name'}</Label>
              <Input
                id="uom-name"
                {...register('name')}
                disabled={isReadOnly}
                className="font-semibold w-full h-10"
                placeholder={tu('placeholders.name') || 'Enter UoM Name'}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{tv(errors.name.message as never)}</p>}
            </div>

            <div className="col-span-12 w-full bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mt-2">
              <div className="flex items-center gap-2 mb-2 text-amber-500 block">
                <Activity className="w-3.5 h-3.5" />
                <span className="text-label-xs font-semibold uppercase">{tu('precision')}</span>
              </div>
              <p className="text-label-xs text-muted-foreground/80 uppercase font-medium leading-relaxed block">
                {tu('precision_description')}
              </p>
            </div>
          </FormGridArea>

          {!isReadOnly && (
            <FormFooter>
              <button
                type="button"
                onClick={() => guardedRouter.push('/master-data/units-of-measure', { skipGuard: true })}
                className="bg-transparent border border-gray-300 text-text-main hover:bg-muted h-10 px-4 rounded-md transition-colors"
                disabled={isSaving}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={onSubmit}
                className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                disabled={conflict.saveDisabled || !isDirty || isSaving}
              >
                {isSaving ? t('saving') : t('save')}
              </button>
            </FormFooter>
          )}
        </FormCard>
      </FormContainer>

      <ConflictDialog
        open={conflict.open}
        onReload={conflict.handleReload}
        onClose={conflict.handleClose}
      />

      <PostConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title={tu('delete_confirm_title')}
        description={tu('delete_confirm_desc')}
        isLoading={deleteUoM.isPending}
        variant="destructive"
      />
    </div>
  );
}
