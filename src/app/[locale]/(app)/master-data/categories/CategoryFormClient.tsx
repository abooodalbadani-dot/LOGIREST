'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { useMasterDataItem, useMasterDataCreate, useMasterDataUpdate } from '@/features/master-data/hooks/useMasterDataCRUD';
import { CategorySchema, CategoryFormSchema, type CategoryFormValues } from '@/types/master-data';
import { Card, CardContent } from '@/components/ui/card';
import { Layers } from 'lucide-react';

interface Props { id: string | null; createTitle: string; editTitle: string; locale: string; }

export function CategoryFormClient({ id, createTitle, editTitle, locale }: Props) {
  const tc = useTranslations('masterData.common');
  const router = useRouter();

  const { data } = useMasterDataItem('categories', id, CategorySchema);
  const create = useMasterDataCreate('categories', CategorySchema);
  const update = useMasterDataUpdate('categories', CategorySchema);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryFormValues>({
    resolver: zodResolver(CategoryFormSchema),
    defaultValues: { name_ar: '', name_en: '' },
  });

  useEffect(() => {
    if (data) reset({ name_ar: data.name_ar, name_en: data.name_en });
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (id) await update.mutateAsync({ id, body: values });
    else await create.mutateAsync(values);
    router.push(`/${locale}/master-data/categories`);
  });



  return (
    <MasterDataFormLayout
      title={id ? editTitle : createTitle}
      backHref={`/${locale}/master-data/categories`}
      isSaving={create.isPending || update.isPending}
      onSubmit={onSubmit}
    >
      <div className="space-y-8">
        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
          <CardContent className="p-8 space-y-8">
            {/* Section Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
              <div className="w-10 h-10 rounded-sm bg-cyan-500/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">{tc('basic_info')}</h3>
                <p className="text-[10px] font-bold text-muted-foreground/60/40 uppercase tracking-widest mt-0.5">
                  {tc('category_classification_details')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Name EN */}
              <div className="space-y-2">
                <Label htmlFor="cat-name-en" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                  {tc('name_en')}
                </Label>
                <Input
                  id="cat-name-en"
                  dir="ltr"
                  {...register('name_en')}
                  className="bg-surface-container-highest/30 border-none h-12 text-sm font-bold focus-visible:ring-1 focus-visible:ring-cyan-500/50"
                  placeholder="e.g. Raw Materials"
                />
                {errors.name_en && (
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">
                    {errors.name_en.message}
                  </p>
                )}
              </div>

              {/* Name AR */}
              <div className="space-y-2">
                <Label htmlFor="cat-name-ar" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                  {tc('name_ar')}
                </Label>
                <Input
                  id="cat-name-ar"
                  dir="rtl"
                  {...register('name_ar')}
                  className="bg-surface-container-highest/30 border-none h-12 text-sm font-bold focus-visible:ring-1 focus-visible:ring-cyan-500/50 text-end"
                  placeholder="مثال: مواد خام"
                />
                {errors.name_ar && (
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">
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
