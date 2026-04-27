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
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, Globe } from 'lucide-react';

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

  const breadcrumbs = [
    { label: tc('home'), href: `/${locale}/dashboard` },
    { label: tc('title'), href: `/${locale}/master-data` },
    { label: tc('categories'), href: `/${locale}/master-data/categories` },
    { label: id ? editTitle : createTitle, href: '#' },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbs} />

      <MasterDataFormLayout
        title={id ? editTitle : createTitle}
        backHref={`/${locale}/master-data/categories`}
        isSaving={create.isPending || update.isPending}
        onSubmit={onSubmit}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left: Main Form (2 cols) ────────────────────────────── */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
              <CardContent className="p-6 space-y-8">
                {/* Section Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                  <div className="w-10 h-10 rounded-sm bg-cyan-500/10 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">{tc('basic_info')}</h3>
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium">
                      Category classification details
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
                      className="bg-surface-container-highest/30 border-none h-12 text-sm font-bold focus-visible:ring-1 focus-visible:ring-cyan-500/50 text-right"
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

          {/* ── Right: Side Panel (1 col) ───────────────────────────── */}
          <div className="space-y-8">
            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                  <div className="w-10 h-10 rounded-sm bg-emerald-500/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
                      {tc('registry_status') || 'Registry Status'}
                    </h4>
                    <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                      {tc('bilingual_record') || 'Bilingual classification record'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between py-2 px-3 bg-surface-container-highest/20 rounded-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">EN</span>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tight">
                      {tc('required') || 'Required'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-surface-container-highest/20 rounded-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">AR</span>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tight">
                      {tc('required') || 'Required'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-surface-container-highest/20 rounded-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      {tc('scope') || 'Scope'}
                    </span>
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-tight">
                      {tc('global') || 'Global'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MasterDataFormLayout>
    </div>
  );
}
