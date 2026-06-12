'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useTranslations, useLocale } from 'next-intl';
import { useForm, Controller, useWatch } from 'react-hook-form';
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
  const { data: warehousesData } = useWarehouses();
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
      defaultValues: { branchId: '', code: '', name: '', type: 'main', isActive: true, version: undefined },
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

  const typeItems = useMemo(() => {
    return (['main','dry','cold','virtual','transit'] as const).map((ty) => ({
      id: ty,
      name_en: tw(`types.${ty.toLowerCase() as 'main' | 'dry' | 'cold' | 'virtual' | 'transit'}`),
      name_ar: tw(`types.${ty.toLowerCase() as 'main' | 'dry' | 'cold' | 'virtual' | 'transit'}`),
    }));
  }, [tw]);

  useEffect(() => {
    if (data) {
      reset({ branchId: data.branchId, code: data.code, name: data.name, type: data.type, isActive: data.isActive, version: data.version });
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

  const onValid = async (values: WarehouseFormValues) => {
    if (isReadOnly) return;
    
    try {
      if (id) {
        await update.mutateAsync({ id, values, signal: abortController.signal });
      } else {
        await create.mutateAsync({ ...values, signal: abortController.signal });
      }
      reset(values);
      guardedRouter.push('/master-data/warehouses', { skipGuard: true });
    } catch {
      // Error handled by mutation hooks or conflict handler
    }
  };

  const onSubmit = handleSubmit(onValid, onFormError);

  const handleArchive = async () => {
    if (!id) return;
    try {
      await archiveWarehouse.mutateAsync({ id, signal: abortController.signal });
      guardedRouter.push('/master-data/warehouses', { skipGuard: true });
    } catch {
      setShowDeleteConfirm(false);
    }
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <Warehouse className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-body-md font-semibold text-foreground uppercase">{tw('title')}</h3>
                  <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">
                    {tw('description')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="wh-branch" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
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
                  {errors.branchId && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.branchId.message as never)}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wh-code" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                    {tw('fields.code')}
                  </Label>
                  <Input 
                    id="wh-code" 
                    dir="ltr" 
                    {...register('code')} 
                    disabled={isReadOnly}
                    className="font-mono font-semibold uppercase text-status-active"
                    placeholder={tw('code_placeholder')}
                  />
                  {errors.code && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.code.message as never)}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="wh-name" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                    {tw('fields.name_en')} {/* Use generic name translation if available, else keep name_en/name_ar fallback or create a new one */}
                  </Label>
                  <Input 
                    id="wh-name" 
                    {...register('name')} 
                    disabled={isReadOnly}
                    className="font-semibold" 
                  />
                  {errors.name && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.name.message as never)}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-body-md font-semibold text-foreground uppercase">{tw('fields.type')}</h3>
                  <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">
                    {t('operational_status')}
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-w-md">
                <Label htmlFor="wh-type" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                  {tw('fields.type')}
                </Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <SmartCombobox
                      disabled={isReadOnly}
                      value={field.value}
                      onSelect={(item) => field.onChange(item.id)}
                      items={typeItems}
                      className="w-full bg-surface-container-high/40 hover:bg-surface-container-high transition-colors text-label-xs font-bold"
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-body-md font-semibold text-foreground uppercase">{t('status')}</h3>
                  <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">
                    {t('operational_status')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 group transition-all hover:bg-surface-container-highest/30">
                <div className="space-y-1">
                  <Label htmlFor="wh-active" className="text-label-xs font-semibold uppercase cursor-pointer text-muted-foreground/60">{tw('fields.is_active')}</Label>
                  <p className={`text-label-sm font-semibold uppercase ${isActive ? 'text-status-active' : 'text-status-error'}`}>
                    {isActive ? t('active') : t('inactive')}
                  </p>
                </div>
                <Switch 
                  id="wh-active" 
                  checked={isActive} 
                  onCheckedChange={(v: boolean) => !isReadOnly && setValue('isActive', v)} 
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
