'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Truck, CreditCard, ShieldCheck, Hash, Globe2, Coins, ScrollText } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { useSupplier, useCreateSupplier, useUpdateSupplier } from '@/features/suppliers/hooks/useSuppliers';
import { useCurrencies } from '@/features/purchasing/hooks/useCurrencies';
import { SupplierFormSchema, type SupplierFormValues } from '@/types/master-data';

interface Props {
 id: string | null;
 createTitle: string;
 editTitle: string;
 locale: string;
}

export function SupplierFormClient({ id, createTitle, editTitle, locale }: Props) {
 const tc = useTranslations('common');
 const ts = useTranslations('master_data.suppliers');
 const router = useRouter();

 const { data } = useSupplier(id);
 const { data: currencies } = useCurrencies();
 const create = useCreateSupplier();
 const update = useUpdateSupplier();

 const { register, handleSubmit, reset, setValue, control, formState: { errors } } =
 useForm<SupplierFormValues>({
 resolver: zodResolver(SupplierFormSchema),
 defaultValues: { code: '', name_ar: '', name_en: '', currency_id: '', payment_terms: '', is_active: true },
 });

 const isActive = useWatch({ control, name: 'is_active' });

 useEffect(() => {
 if (data) {
 reset({
 code: data.code,
 name_ar: data.name_ar,
 name_en: data.name_en,
 currency_id: data.currency_id,
 payment_terms: data.payment_terms || '',
 is_active: data.is_active,
 });
 }
 }, [data, reset]);

 const onSubmit = handleSubmit(async (values) => {
 try {
 if (id) {
 await update.mutateAsync({ id, values });
 } else {
 await create.mutateAsync(values);
 }
 router.push(`/ ${locale}/master-data/suppliers`);
 } catch (error) {
 // Error handled by mutation toast
 }
 });

 const isSaving = create.isPending || update.isPending;

 return (
 <MasterDataFormLayout
 title={id ? editTitle : createTitle}
 backHref={`/ ${locale}/master-data/suppliers`}
 isSaving={isSaving}
 onSubmit={onSubmit}
 >
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <div className="lg:col-span-2 space-y-8">
 <Card className="bg-surface-container-low border-none overflow-hidden">
 <CardContent className="p-8 space-y-8">
 <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
 <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
 <Truck className="w-5 h-5 text-tertiary" />
 </div>
 <div>
 <h3 className="text-body-md font-semibold text-foreground uppercase">{ts('partner_identity')}</h3>
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{ts('partner_identity_desc')}</p>
 </div>
 </div>

 <div className="space-y-6">
 <div className="space-y-2 max-w-sm">
 <Label htmlFor="sup-code" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{tc('code')}</Label>
 <Input 
 id="sup-code" 
 dir="ltr" 
 {...register('code')} 
 className="font-mono font-semibold uppercase text-status-active" 
 placeholder="e.g. SUP-001" 
 />
 {errors.code && <p className="text-label-xs font-semibold text-status-error uppercase">{errors.code.message}</p>}
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-2">
 <Label htmlFor="sup-name-en" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{tc('name_en')}</Label>
 <Input 
 id="sup-name-en" 
 dir="ltr" 
 {...register('name_en')} 
 className="font-semibold" 
 placeholder="Supplier Name" 
 />
 {errors.name_en && <p className="text-label-xs font-semibold text-status-error uppercase">{errors.name_en.message}</p>}
 </div>

 <div className="space-y-2">
 <Label htmlFor="sup-name-ar" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{tc('name_ar')}</Label>
 <Input 
 id="sup-name-ar" 
 dir="rtl" 
 {...register('name_ar')} 
 className="font-semibold text-end" 
 placeholder="اسم المورد" 
 />
 {errors.name_ar && <p className="text-label-xs font-semibold text-status-error uppercase">{errors.name_ar.message}</p>}
 </div>
 </div>
 </div>
 </CardContent>
 </Card>

 <Card className="bg-surface-container-low border-none overflow-hidden">
 <CardContent className="p-8 space-y-8">
 <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
 <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
 <CreditCard className="w-5 h-5 text-tertiary" />
 </div>
 <div>
 <h3 className="text-body-md font-semibold text-foreground uppercase">{ts('financial_terms')}</h3>
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{ts('financial_terms_desc')}</p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-2">
 <Label htmlFor="sup-currency" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{ts('fields.currency')}</Label>
 <Controller
 name="currency_id"
 control={control}
 render={({ field }) => (
 <Select value={field.value} onValueChange={field.onChange}>
 <SelectTrigger id="sup-currency">
 <SelectValue placeholder="—" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="">—</SelectItem>
 {currencies?.map((c: any) => (
 <SelectItem key={c.id} value={c.id} className="font-semibold text-label-sm uppercase">
 {c.code} — {c.name_en}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 )}
 />
 {errors.currency_id && <p className="text-label-xs font-semibold text-status-error uppercase">{errors.currency_id.message}</p>}
 </div>

 <div className="space-y-2">
 <Label htmlFor="sup-terms" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{ts('fields.payment_terms')}</Label>
 <Textarea 
 id="sup-terms" 
 rows={4} 
 {...register('payment_terms')} 
 className="font-medium resize-none p-4" 
 placeholder={ts('terms_placeholder')} 
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
 <h3 className="text-body-md font-semibold text-foreground uppercase">{tc('status_label')}</h3>
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{tc('status_label')}</p>
 </div>
 </div>

 <div className="flex items-center justify-between p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 group transition-all hover:bg-surface-container-highest/30">
 <div className="space-y-1">
 <Label htmlFor="sup-active" className="text-label-xs font-semibold uppercase cursor-pointer text-muted-foreground/60">{tc('is_active')}</Label>
 <p className={`text-label-sm font-semibold uppercase ${isActive ? 'text-status-active' : 'text-status-error'}`}>{isActive ? tc('active') : tc('inactive')}</p>
 </div>
 <Switch
 id="sup-active"
 checked={isActive}
 onCheckedChange={(v) => setValue('is_active', v)}
 className="data-[state=checked]:bg-status-active"
 />
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 </MasterDataFormLayout>
 );
}
