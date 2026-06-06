'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ruler, Activity, ShieldCheck, Tags } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useUoM, useCreateUoM, useUpdateUoM, useDeleteUoM } from '@/features/uoms/hooks/useUoMs';
import { UoMFormSchema, type UoMFormValues } from '@/types/master-data';
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
  const create = useCreateUoM();
  const conflict = useConflictHandler('uom', id ?? '');
  const update = useUpdateUoM({ onConflict: conflict.triggerConflict });
  const deleteUoM = useDeleteUoM();
  const { playSound } = useAudioFeedback();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { register, handleSubmit, reset, control, setValue, formState: { errors, isDirty, isValid } } = useForm<UoMFormValues>({
    resolver: zodResolver(UoMFormSchema),
    defaultValues: { code: '', name: '', category: '', isActive: true, version: undefined },
    disabled: isReadOnly,
  });

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  const isActive = useWatch({ control, name: 'isActive' });

  useEffect(() => {
    if (data) {
      reset({ 
        code: data.code, 
        name: data.name, 
        category: data.category || '',
        isActive: data.isActive,
        version: data.version
      });
    }
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
        onBack={() => guardedRouter.push('/master-data/units-of-measure', { skipGuard: true })}
      />
    );
  }

  const onValid = async (values: UoMFormValues) => {
    if (isReadOnly) return;
    
    try {
      if (id) {
        await update.mutateAsync({ id, values, signal: abortController.signal });
      } else {
        await create.mutateAsync({ ...values, signal: abortController.signal });
      }
      reset(values);
      guardedRouter.push('/master-data/units-of-measure', { skipGuard: true });
    } catch {
      // Error handled by mutation hooks or conflict handler
    }
  };

  const onSubmit = handleSubmit(onValid, onFormError);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteUoM.mutateAsync({ id, signal: abortController.signal });
      guardedRouter.push('/master-data/units-of-measure', { skipGuard: true });
    } catch {
      setShowDeleteConfirm(false);
    }
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
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
                  <div className="space-y-2 max-w-sm">
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

                  <div className="space-y-2 max-w-sm">
                    <Label htmlFor="uom-category" className="text-label-xs font-semibold uppercase text-muted-foreground/70 flex items-center gap-2">
                      <Tags className="w-3 h-3" />
                      {tu('fields.category')}
                    </Label>
                    <Controller
                      name="category"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          disabled={isReadOnly}
                        >
                          <SelectTrigger id="uom-category" className="bg-surface-container-lowest border-none h-11 rounded-xl font-semibold text-label-xs uppercase">
                            <SelectValue placeholder={t('select_none')} />
                          </SelectTrigger>
                          <SelectContent>
                            {['mass', 'volume', 'unit', 'count', 'length', 'area'].map(cat => (
                              <SelectItem key={cat} value={cat} className="text-label-xs font-semibold uppercase">
                                {tu(`category_options.${cat}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="bg-surface-container-low border-none overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                  <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-tertiary" />
                  </div>
                  <div>
                    <h3 className="text-body-md font-semibold text-foreground uppercase">{t('status')}</h3>
                    <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{t('status')}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 group transition-all hover:bg-surface-container-highest/30">
                  <div className="space-y-1">
                    <Label htmlFor="uom-active" className="text-label-xs font-semibold uppercase cursor-pointer text-muted-foreground/60">{t('is_active')}</Label>
                    <p className={`text-label-sm font-semibold uppercase ${isActive ? 'text-status-active' : 'text-status-error'}`}>{isActive ? t('active') : t('inactive')}</p>
                  </div>
                  <Switch
                    id="uom-active"
                    checked={isActive}
                    onCheckedChange={(v) => setValue('isActive', v)}
                    className="data-[state=checked]:bg-status-active"
                  />
                </div>

                <div className="p-4 bg-amber-500/5 rounded-md border border-amber-500/10 border-dashed">
                  <div className="flex items-center gap-2 mb-2 text-amber-500">
                    <Activity className="w-3.5 h-3.5" />
                    <span className="text-label-xs font-semibold uppercase">{tu('precision')}</span>
                  </div>
                  <p className="text-label-xs text-muted-foreground/50 uppercase font-medium leading-relaxed">
                    {tu('precision_description')}
                  </p>
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
        title={tu('delete_confirm_title')}
        description={tu('delete_confirm_desc')}
        isLoading={deleteUoM.isPending}
        variant="destructive"
      />
    </>
  );
}
