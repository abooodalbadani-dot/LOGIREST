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
} from '@/features/categories/hooks/useCategories';
import { CategoryFormSchema, type CategoryFormValues } from '@/types/master-data';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, Edit3 } from 'lucide-react';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/PermissionGate';

interface Props { 
  id: string | null; 
  createTitle: string; 
  editTitle: string; 
  viewTitle: string;
  locale: string; 
  isReadOnly?: boolean;
}

export function CategoryFormClient({ id, createTitle, editTitle, viewTitle, locale, isReadOnly = false }: Props) {
  const t = useTranslations('common');
  const tc = useTranslations('master_data.categories');

  const { data, isLoading, isError, isFetched, refetch } = useCategory(id);
  const create = useCreateCategory();
  const update = useUpdateCategory();

  const { register, handleSubmit, reset, formState: { errors, isDirty, isValid } } = useForm<CategoryFormValues>({
    resolver: zodResolver(CategoryFormSchema),
    defaultValues: { name_ar: '', name_en: '' },
    disabled: isReadOnly,
  });
  
  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);
  
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

  useEffect(() => {
    if (data) reset({ name_ar: data.name_ar, name_en: data.name_en });
  }, [data, reset]);

  const onSubmit = handleSubmit((values) => {
    if (isReadOnly) return;
    
    if (id) {
      update.mutate({ id, values }, {
        onSuccess: () => {
          guardedRouter.push('/master-data/categories', { skipGuard: true });
        }
      });
    } else {
      create.mutate(values, {
        onSuccess: () => {
          guardedRouter.push('/master-data/categories', { skipGuard: true });
        }
      });
    }
  });

 return (
  <MasterDataFormLayout
    title={isReadOnly ? viewTitle : (id ? editTitle : createTitle)}
    backHref='/master-data/categories'
    isSaving={create.isPending || update.isPending}
    onSubmit={onSubmit}
    onCancel={() => guardedRouter.push('/master-data/categories')}
    hideSave={isReadOnly}
    resource="master_data"
    saveAction={id ? 'edit' : 'create'}
    isDirty={isDirty}
    isValid={isValid}
    headerActions={
      isReadOnly && id && (
        <PermissionGate action="edit" resource="master_data">
          <Button 
            onClick={() => guardedRouter.push(`/master-data/categories/${id}/edit`)}
            className="bg-operational-cyan text-white hover:bg-operational-cyan/90 font-bold rounded-xl flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            {t('edit')}
          </Button>
        </PermissionGate>
      )
    }
  >
 <div className="space-y-8">
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
 {/* Name EN */}
 <div className="space-y-2">
 <Label htmlFor="cat-name-en" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
 {tc('fields.name_en')}
 </Label>
                <Input
                  id="cat-name-en"
                  dir="ltr"
                  {...register('name_en')}
                  disabled={isReadOnly}
                  className="font-semibold"
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
                  disabled={isReadOnly}
                  className="font-semibold text-end"
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
 );
}
