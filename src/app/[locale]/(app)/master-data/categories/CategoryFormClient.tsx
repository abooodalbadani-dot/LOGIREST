'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Layers } from 'lucide-react';

interface Props { id: string | null; createTitle: string; editTitle: string; locale: string; }

export function CategoryFormClient({ id, createTitle, editTitle, locale }: Props) {
 const t = useTranslations('common');
 const tc = useTranslations('master_data.categories');
 const router = useRouter();

 const { data } = useCategory(id);
 const create = useCreateCategory();
 const update = useUpdateCategory();

 const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryFormValues>({
 resolver: zodResolver(CategoryFormSchema),
 defaultValues: { name_ar: '', name_en: '' },
 });

 useEffect(() => {
 if (data) reset({ name_ar: data.name_ar, name_en: data.name_en });
 }, [data, reset]);

 const onSubmit = handleSubmit(async (values) => {
 try {
 if (id) await update.mutateAsync({ id, values });
 else await create.mutateAsync(values);
 router.push(`/${locale}/master-data/categories`);
 } catch (error) {
 // Handled by mutation hook
 }
 });



 return (
 <MasterDataFormLayout
 title={id ? editTitle : createTitle}
 backHref={`/${locale}/master-data/categories`}
 isSaving={create.isPending || update.isPending}
 onSubmit={onSubmit}
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
 className="font-semibold"
 placeholder="e.g. Raw Materials"
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
 className="font-semibold text-end"
 placeholder="مثال: مواد خام"
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
