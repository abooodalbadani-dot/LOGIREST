'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Truck, Globe, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useMasterDataItem, useMasterDataList, useMasterDataCreate, useMasterDataUpdate } from '@/features/master-data/hooks/useMasterDataCRUD';
import { SupplierSchema, SupplierFormSchema, type SupplierFormValues, CurrencySchema } from '@/types/master-data';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
  locale: string;
}

export function SupplierFormClient({ id, createTitle, editTitle, locale }: Props) {
  const t = useTranslations('masterData.common');
  const ts = useTranslations('masterData.suppliers');
  const router = useRouter();

  const { data } = useMasterDataItem('suppliers', id, SupplierSchema);
  const { data: currencies } = useMasterDataList('currencies', CurrencySchema);
  const create = useMasterDataCreate('suppliers', SupplierSchema);
  const update = useMasterDataUpdate('suppliers', SupplierSchema);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<SupplierFormValues>({
      resolver: zodResolver(SupplierFormSchema),
      defaultValues: { code: '', name_ar: '', name_en: '', currency_id: '', payment_terms: '', is_active: true },
    });

  useEffect(() => {
    if (data) {
      reset({
        code: data.code, name_ar: data.name_ar, name_en: data.name_en,
        currency_id: data.currency_id, payment_terms: data.payment_terms, is_active: data.is_active,
      });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (id) await update.mutateAsync({ id, body: values });
    else await create.mutateAsync(values);
    router.push(`/${locale}/master-data/suppliers`);
  });

  const isSaving = create.isPending || update.isPending;
  const isActive = watch('is_active');

  return (
    <div className="space-y-2">
      <div className="px-8 pt-8 max-w-[1000px] mx-auto">
        <Breadcrumb 
          items={[
            { label: t('home'), href: `/${locale}/dashboard` },
            { label: t('master_data') },
            { label: ts('title'), href: `/${locale}/master-data/suppliers` },
            { label: id ? editTitle : createTitle }
          ]} 
        />
      </div>
      <MasterDataFormLayout 
        title={id ? editTitle : createTitle} 
        backHref={`/${locale}/master-data/suppliers`}
        isSaving={isSaving} 
        onSubmit={onSubmit}
      >
        <div className="grid gap-8">
          {/* Section: Partner Identity */}
          <div className="grid gap-6">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-cyan-500" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-500/80">{ts('partner_identity')}</h2>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="sup-code" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{t('code')}</Label>
              <Input id="sup-code" dir="ltr" {...register('code')} className="h-11 bg-surface-container-highest/20 border-white/5 font-mono uppercase" placeholder="SUP-001" />
              {errors.code && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.code.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sup-name-ar" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{t('name_ar')}</Label>
              <Input id="sup-name-ar" dir="rtl" {...register('name_ar')} className="h-11 bg-surface-container-highest/20 border-white/5 font-bold" placeholder="اسم المورد" />
              {errors.name_ar && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.name_ar.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sup-name-en" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{t('name_en')}</Label>
              <Input id="sup-name-en" dir="ltr" {...register('name_en')} className="h-11 bg-surface-container-highest/20 border-white/5 font-bold" placeholder="Supplier Name" />
              {errors.name_en && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.name_en.message}</p>}
            </div>
          </div>

          <Separator className="bg-white/5" />

          {/* Section: Financial & Terms */}
          <div className="grid gap-6">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400/80">{ts('financial_terms')}</h2>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sup-currency" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{ts('currency')}</Label>
              <select id="sup-currency" {...register('currency_id')}
                className="h-11 px-3 bg-surface-container-highest/20 border-white/5 rounded-sm w-full text-xs font-bold appearance-none hover:bg-surface-container-highest/30 transition-colors">
                <option value="" className="bg-surface-container-low text-muted-foreground">—</option>
                {currencies?.data?.map((c) => (
                  <option key={c.id} value={c.id} className="bg-surface-container-low uppercase">
                    {c.code} — {c.name_en}
                  </option>
                ))}
              </select>
              {errors.currency_id && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.currency_id.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sup-terms" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{ts('payment_terms')}</Label>
              <Textarea id="sup-terms" rows={3} {...register('payment_terms')} className="bg-surface-container-highest/20 border-white/5 text-xs resize-none" placeholder={ts('terms_placeholder')} />
            </div>
          </div>

          <Separator className="bg-white/5" />

          {/* Section: Operational Settings */}
          <div className="grid gap-6">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400/80">{ts('operational_settings')}</h2>
            </div>

            <div className="flex items-center gap-4 py-4 px-6 bg-surface-container-highest/10 rounded-sm border border-white/5">
              <Switch id="sup-active" checked={isActive} onCheckedChange={(v) => setValue('is_active', v)} />
              <div className="space-y-0.5">
                <Label htmlFor="sup-active" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">{t('is_active')}</Label>
                <p className="text-[9px] text-muted-foreground/40 font-bold uppercase">{isActive ? t('active') : t('inactive')}</p>
              </div>
            </div>
          </div>
        </div>
      </MasterDataFormLayout>
    </div>
  );
}
