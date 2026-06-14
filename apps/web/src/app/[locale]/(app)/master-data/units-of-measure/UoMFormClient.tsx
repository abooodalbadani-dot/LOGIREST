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
    <>
      <MasterDataFormLayout
        title={displayTitle}
        backHref='/master-data/units-of-measure'
        isSaving={isSaving} saveDisabled={conflict.saveDisabled}
        onSubmit={onSubmit}
        onCancel={() => guardedRouter.push('/master-data/units-of-measure', { skipGuard: true })}
        hideSave={isReadOnly}
        isDirty={isDirty}
        isValid={isValid}
        headerActions={
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
      >
        <div className="max-w-3xl mx-auto space-y-8">
          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <Ruler className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-body-md font-semibold text-foreground uppercase">{t('basic_info')}</h3>
                  <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{tu('description')}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="uom-code" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{t('code')}</Label>
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
                          className="font-mono font-semibold uppercase text-status-active" 
                          placeholder={tu('placeholders.code')} 
                        />
                    )}
                  />
                  {errors.code && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.code.message as never)}</p>}
                </div>

                <div className="space-y-2 max-w-md">
                  <Label htmlFor="uom-name" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{t('name') || 'Name'}</Label>
                  <Input 
                    id="uom-name" 
                    {...register('name')} 
                    disabled={isReadOnly}
                    className="font-semibold" 
                    placeholder={tu('placeholders.name') || 'Enter UoM Name'} 
                  />
                  {errors.name && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.name.message as never)}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-4 bg-amber-500/5 rounded-md border border-amber-500/10 border-dashed max-w-md">
            <div className="flex items-center gap-2 mb-2 text-amber-500">
              <Activity className="w-3.5 h-3.5" />
              <span className="text-label-xs font-semibold uppercase">{tu('precision')}</span>
            </div>
            <p className="text-label-xs text-muted-foreground/50 uppercase font-medium leading-relaxed">
              {tu('precision_description')}
            </p>
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
        title={tu('delete_confirm_title')}
        description={tu('delete_confirm_desc')}
        isLoading={deleteUoM.isPending}
        variant="destructive"
      />
    </>
  );
}
