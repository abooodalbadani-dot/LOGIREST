'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useTranslations, useLocale } from 'next-intl';
import { useForm, Controller, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import {
  useWarehouse,
  useCreateWarehouse,
  useUpdateWarehouse,
  useArchiveWarehouse,
  useWarehouses,
} from '@/features/warehouses/hooks/useWarehouses';
import { useBranches } from '@/features/branches/hooks/useBranches';
import {
  WarehouseFormSchema,
  type WarehouseFormValues,
  type Warehouse as WarehouseModel,
} from '@/types/master-data';

import { Card, CardContent } from '@/components/ui/card';
import { Warehouse, MapPin, Activity, Trash2 } from 'lucide-react';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { toast } from 'sonner';

import { useAbortController } from '@/hooks/useAbortController';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { onFormError } from '@/hooks/useFormError';
import { generateNextCode } from '@/lib/code-generator';

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
  viewTitle?: string;
  isReadOnly?: boolean;
}

export function WarehouseFormClient({ id, createTitle, editTitle, viewTitle, isReadOnly = false }: Props) {
  const t = useTranslations('common');
  const tw = useTranslations('master_data.warehouses');
  const tv = useTranslations();
  const locale = useLocale();
  const abortController = useAbortController();

  const { data, isLoading, isError, isFetched, refetch } = useWarehouse(id);
  const { data: warehousesData } = useWarehouses({ includeInactive: true });
  const { data: branchesData, isLoading: isLoadingBranches, isError: isErrorBranches } = useBranches();
  const branches = branchesData?.data || [];
  const create = useCreateWarehouse();
  const conflict = useConflictHandler('warehouse', id ?? '');
  const update = useUpdateWarehouse({ onConflict: conflict.triggerConflict });
  const archiveWarehouse = useArchiveWarehouse();
  const { playSound } = useAudioFeedback();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAutoPopulated, setIsAutoPopulated] = useState(false);

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isDirty, isValid } } =
    useForm<WarehouseFormValues>({
      resolver: zodResolver(WarehouseFormSchema),
      disabled: isReadOnly,
      defaultValues: { branchId: '', code: '', name: '', isActive: true, version: undefined },
    });

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  const isActive = useWatch({ control, name: 'isActive' });
  const codeValue = useWatch({ control, name: 'code' });

  useEffect(() => {
    if (!id && warehousesData?.data && !codeValue && !isAutoPopulated) {
      const existingCodes = warehousesData.data.map((w: WarehouseModel) => w.code);
      const nextCode = generateNextCode(existingCodes, 'WH-', 3);
      setValue('code', nextCode, { shouldDirty: true, shouldValidate: true });
      setIsAutoPopulated(true);
    }
  }, [id, warehousesData, setValue, codeValue, isAutoPopulated]);

  const branchItems = useMemo(() => {
    return branches.map((b) => ({
      id: b.id,
      name_en: `${b.code} — ${b.name}`,
      name_ar: `${b.code} — ${b.name}`,
    }));
  }, [branches, locale]);

  useEffect(() => {
    if (data) {
      reset({ branchId: data.branchId, code: data.code, name: data.name, isActive: data.isActive, version: data.version });
    }
  }, [data, reset]);

  // 1. Loading State
  if ((id && isLoading) || isLoadingBranches) {
    return <PageSkeleton variant="detail" />;
  }

  // 2. Not Found State (Smart 404)
  if (id && isFetched && !data) {
    return (
      <ErrorState
        type="not_found"
        onRetry={() => guardedRouter.push('/master-data/warehouses', { skipGuard: true })}
      />
    );
  }

  // 3. Server Error State
  if (isError || isErrorBranches) {
    return (
      <ErrorState
        type="server_error"
        onRetry={() => refetch()}
      />
    );
  }

  const onValid = (values: WarehouseFormValues) => {
    if (isReadOnly) return;

    const payload = {
      branchId: values.branchId,
      code: values.code || undefined,
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
            toast.success(tw('updated_success') || 'Warehouse updated successfully');
            reset(values);
            guardedRouter.push('/master-data/warehouses', { skipGuard: true });
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
            toast.success(tw('created_success') || 'Warehouse created successfully');
            reset(values);
            guardedRouter.push('/master-data/warehouses', { skipGuard: true });
          },
          onError: (error) => {
            console.error('Create failed:', error);
          }
        }
      );
    }
  };

  const onInvalid = (errors: FieldErrors<WarehouseFormValues>) => {
    console.log('3. [WarehouseForm] Validation FAILED (Silent Zod Blocker):', errors);
    onFormError(errors);
  };

  const onSubmit = handleSubmit(onValid, onInvalid);

  const handleArchive = () => {
    if (!id) return;
    archiveWarehouse.mutate(
      { id, signal: abortController.signal },
      {
        onSuccess: () => {
          toast.success(tw('archived_success') || 'Warehouse archived successfully');
          guardedRouter.push('/master-data/warehouses', { skipGuard: true });
        },
        onError: (error) => {
          console.error('Archive failed:', error);
          setShowDeleteConfirm(false);
        }
      }
    );
  };

  const isSaving = create.isPending || update.isPending || archiveWarehouse.isPending;

  // Determine the display title
  const displayTitle = id
    ? (isReadOnly ? (viewTitle || tw('view_title')) : editTitle)
    : createTitle;

  return (
    <>
      <MasterDataFormLayout
        title={displayTitle}
        backHref='/master-data/warehouses'
        isSaving={isSaving}
        saveDisabled={conflict.saveDisabled}
        onSubmit={onSubmit}
        onCancel={() => guardedRouter.push('/master-data/warehouses', { skipGuard: true })}
        hideSave={isReadOnly}
        isDirty={isDirty}
        isValid={isValid}
        resource="master_data_warehouses"
        headerActions={
          id && !isReadOnly && (
            <PermissionGate action="delete" resource="master_data_warehouses">
              <div className="flex items-center gap-2">
                {(data as { has_stock?: boolean } | null)?.has_stock && (
                  <span className="text-[10px] uppercase font-bold text-status-warning bg-status-warning/10 px-2 py-1 rounded">
                    {tw('contains_stock_warning', { defaultValue: 'Contains Stock' })}
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-status-error hover:text-status-error hover:bg-status-error/10 rounded-full w-10 h-10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSaving || (data as { has_stock?: boolean } | null)?.has_stock}
                  title={(data as { has_stock?: boolean } | null)?.has_stock ? 'Cannot archive: warehouse contains active stock' : 'Archive warehouse'}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </PermissionGate>
          )
        }
      >
        <div className="col-span-12 w-full max-w-3xl mx-auto flex flex-col gap-8 p-6 bg-card border border-border rounded-xl mt-6">
          {/* Details Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <Warehouse className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{tw('title')}</h3>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Branch */}
              <div className="col-span-1 md:col-span-6 w-full text-start">
                <Label htmlFor="wh-branch" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {tw('fields.branch')}
                </Label>
                <Controller
                  name="branchId"
                  control={control}
                  render={({ field }) => (
                    <SmartCombobox
                      disabled={isReadOnly}
                      value={field.value}
                      onSelect={(item) => field.onChange(item.id)}
                      items={branchItems}
                      placeholder={t('null_select')}
                      className="w-full bg-surface-container-high/40 hover:bg-surface-container-high transition-colors text-label-xs font-bold"
                    />
                  )}
                />
                {errors.branchId && <p className="text-xs text-red-500 mt-1">{tv(errors.branchId.message as never)}</p>}
              </div>

              {/* Code */}
              <div className="col-span-1 md:col-span-6 w-full text-start">
                <Label htmlFor="wh-code" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {tw('fields.code')}
                </Label>
                <Input
                  id="wh-code"
                  dir="ltr"
                  {...register('code')}
                  disabled={isReadOnly}
                  className="font-mono font-semibold uppercase text-status-active w-full h-10"
                  placeholder={tw('code_placeholder')}
                />
                {errors.code && <p className="text-xs text-red-500 mt-1">{tv(errors.code.message as never)}</p>}
              </div>

              {/* Name */}
              <div className="col-span-1 md:col-span-12 w-full text-start">
                <Label htmlFor="wh-name" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {tw('fields.name_en')}
                </Label>
                <Input
                  id="wh-name"
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
              <Activity className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{t('status')}</h3>
            </div>

            <div className="flex flex-row items-center justify-between w-full rounded-lg border border-border p-4 shadow-sm bg-transparent transition-colors hover:bg-muted/30">
              <div className="flex flex-col space-y-1 text-start min-w-0">
                <span className="text-sm font-medium text-text-main dark:text-white">{tw('fields.is_active')}</span>
                <span className="text-xs text-muted-foreground dark:text-gray-400">
                  {isActive ? t('active') : t('inactive')}
                </span>
              </div>
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Switch
                    id="wh-active"
                    checked={field.value ?? true}
                    onCheckedChange={(v: boolean) => !isReadOnly && field.onChange(v)}
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
        onConfirm={handleArchive}
        title={tw('archive_confirm_title') || 'Archive Warehouse'}
        description={tw('archive_confirm_desc') || 'Are you sure you want to archive this warehouse? This will deactivate it and preserve all transaction history.'}
        isLoading={archiveWarehouse.isPending}
        variant="destructive"
      />
    </>
  );
}
