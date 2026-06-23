'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFormError } from '@/hooks/useFormError';
import { 
 Building2, 
 MapPin, 
 Phone, 
 Mail, 
 FileText, 
 Upload, 
 Save, 
 Image as ImageIcon,
 Loader2,
 Trash2,
 LayoutTemplate,
 AppWindow
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
 useRestaurantProfile, 
 useUpdateRestaurantProfile, 
 RestaurantProfileSchema, 
 type RestaurantProfile 
} from '@/features/admin/hooks/useRestaurantProfile';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';

export function ProfileFormClient({ locale: _locale }: { locale: string }) {
 const t = useTranslations('admin.restaurant_profile');
 const tCommon = useTranslations('common');
 const tv = useTranslations();
 const { data: profile, isLoading } = useRestaurantProfile();
 const { mutateAsync: updateProfile, isPending } = useUpdateRestaurantProfile();
 const { playSound } = useAudioFeedback();
 
 const { register, handleSubmit, formState: { errors, isDirty }, reset, control } = useForm<RestaurantProfile>({
  resolver: zodResolver(RestaurantProfileSchema),
 });

 const { router: _guardedRouter } = useUnsavedChangesGuard(isDirty);
 const onFormError = useFormError();
 
 const watchedLogoType = useWatch({ control, name: 'brandingConfig.logoType' }) || 'MARK';

 useEffect(() => {
  if (profile) {
   reset(profile);
  }
 }, [profile, reset]);

 const onSubmit = async (data: RestaurantProfile) => {
  try {
   // Clean payload: empty strings and nulls to undefined
   const cleanData: RestaurantProfile = {
    name: data.name,
    address: data.address === '' ? undefined : (data.address ?? undefined),
    phone: data.phone === '' ? undefined : (data.phone ?? undefined),
    email: data.email === '' ? undefined : (data.email ?? undefined),
    logo: data.logo === '' ? undefined : (data.logo ?? undefined),
    logoUrl: data.logoUrl === '' ? undefined : (data.logoUrl ?? undefined),
    taxNumber: data.taxNumber === '' ? undefined : (data.taxNumber ?? undefined),
    taxId: data.taxId === '' ? undefined : (data.taxId ?? undefined),
    commercialRegistration: data.commercialRegistration === '' ? undefined : (data.commercialRegistration ?? undefined),
    website: data.website === '' ? undefined : (data.website ?? undefined),
    socialLinks: data.socialLinks === '' ? undefined : (data.socialLinks ?? undefined),
    updatedAt: data.updatedAt === '' ? undefined : (data.updatedAt ?? undefined),
    brandingConfig: data.brandingConfig,
   };

   await updateProfile({ values: cleanData });
   reset(cleanData);
  } catch {
   // Error handled by mutation hooks
  }
 };

 if (isLoading) {
 return (
 <div className="min-w-0 gap-6 flex-1 space-y-8 animate-pulse flex-col flex w-full">
 <div className="h-32 bg-surface-container-highest rounded-[var(--radius)] w-full" />
 <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6">
 <div className="h-20 bg-surface-container-highest rounded-[var(--radius)] w-full" />
 <div className="h-20 bg-surface-container-highest rounded-[var(--radius)] w-full" />
 </div>
 </div>
 );
 }

 return (
 <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
  {/* Header section with minimal branding */}
  <div className="flex items-center justify-between border-b border-outline-low pb-8">
    <div className="space-y-1">
      <h1 className="text-headline-lg font-semibold uppercase text-foreground flex items-center gap-4">
        <Building2 className="w-10 h-10 text-operational-cyan" />
        {t('title')}
      </h1>
      <p className="text-label-sm text-muted-foreground/60 uppercase font-bold">
        {t('subtitle')}
      </p>
    </div>
  </div>

  <div className="w-full max-w-4xl mx-auto flex flex-col gap-8 mt-8">
    {/* Logo and Branding */}
    <div className="flex flex-col gap-2 mb-8">
      <label className="text-sm font-medium text-foreground text-start">
        {t('fields.logo')}
      </label>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <Controller
         control={control}
         name="logo"
         render={({ field }) => (
          <div className={`relative bg-muted border-2 border-dashed border-border rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden group transition-all duration-500 ease-in-out ${watchedLogoType === 'BANNER' ? 'w-full md:w-[480px] aspect-[4/1]' : 'w-32 h-32 md:w-40 md:h-40 aspect-square'}`}>
           {field.value ? (
            <>
             <img src={field.value} alt={t('placeholders.logo_alt')} className="w-full h-full object-contain p-2" />
             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <Button
               type="button"
               variant="ghost"
               size="icon"
               onClick={() => document.getElementById('logo-upload')?.click()}
               className="text-white hover:text-operational-cyan"
              >
               <Upload className="w-6 h-6" />
              </Button>
              <Button
               type="button"
               variant="ghost"
               size="icon"
               onClick={() => field.onChange('')}
               className="text-white hover:text-red-400"
              >
               <Trash2 className="w-6 h-6" />
              </Button>
             </div>
            </>
           ) : (
            <div 
             onClick={() => document.getElementById('logo-upload')?.click()}
             className="flex flex-col items-center justify-center gap-4 cursor-pointer min-w-0 w-full h-full hover:bg-muted/50 transition-colors"
            >
             <div className="p-4 bg-surface-container rounded-full">
              <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
             </div>
             <span className="text-label-xs font-bold text-muted-foreground uppercase text-center px-2">
              {t('upload_logo')}
             </span>
            </div>
           )}
           <Input 
            id="logo-upload"
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => {
             const file = e.target.files?.[0];
             if (file) {
              const reader = new FileReader();
              reader.onloadend = () => {
               const base64 = reader.result as string;
               field.onChange(base64);
              };
              reader.readAsDataURL(file);
             }
            }}
           />
          </div>
         )}
        />
        <div className="flex-1 flex flex-col text-start relative min-w-[200px] min-h-[140px] md:min-h-[120px]">
          <div className={`absolute inset-0 flex flex-col justify-center transition-opacity duration-500 ${watchedLogoType === 'MARK' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong>{_locale === 'ar' ? 'موصى به:' : 'Recommended:'}</strong><br />
              {_locale === 'ar' ? 'مربع' : 'Square'}<br />
              512x512<br />
              {_locale === 'ar' ? 'صيغة PNG مع خلفية شفافة.' : 'PNG with transparent background.'}
            </p>
          </div>
          <div className={`absolute inset-0 flex flex-col justify-center transition-opacity duration-500 ${watchedLogoType === 'BANNER' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong>{_locale === 'ar' ? 'موصى به:' : 'Recommended:'}</strong><br />
              {_locale === 'ar' ? 'أفقي / لافتة' : 'Horizontal / Banner'}<br />
              1200x300<br />
              {_locale === 'ar' ? 'صيغة SVG أو PNG عالية الدقة' : 'SVG or high-res PNG'}<br />
              {_locale === 'ar' ? 'نسبة العرض إلى الارتفاع 4:1' : 'Aspect Ratio: 4:1'}
            </p>
          </div>
        </div>
      </div>
    </div>

    {/* Form Fields */}
    <div className="w-full max-w-4xl bg-card border border-border rounded-xl p-8 shadow-sm flex flex-col gap-6">
      
      {/* Report Branding Settings Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-foreground border-b border-border pb-2 mb-4 flex items-center gap-2">
          <LayoutTemplate className="w-5 h-5 text-operational-cyan" />
          {_locale === 'ar' ? 'إعدادات هوية التقارير' : 'Report Branding Settings'}
        </h3>
        <div className="flex flex-col gap-4">
          <label className="text-sm font-medium text-foreground text-start">
            {_locale === 'ar' ? 'نوع الشعار' : 'Logo Type'}
          </label>
          <Controller
            control={control}
            name="brandingConfig.logoType"
            render={({ field }) => (
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <button
                  type="button"
                  onClick={() => field.onChange('MARK')}
                  className={`flex-1 p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-4 text-center ${
                    field.value === 'MARK' || !field.value
                      ? 'border-operational-cyan bg-operational-cyan/5 shadow-[0_0_20px_rgba(var(--operational-cyan-rgb),0.1)]'
                      : 'border-border bg-card hover:bg-muted'
                  }`}
                >
                  <AppWindow className={`w-8 h-8 ${field.value === 'MARK' || !field.value ? 'text-operational-cyan' : 'text-muted-foreground'}`} />
                  <div>
                    <div className="font-bold text-sm text-foreground">{_locale === 'ar' ? 'علامة تجارية' : 'Mark (Small Logo)'}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {_locale === 'ar' ? 'شعار صغير يظهر بجوار اسم النظام' : 'Small logo displayed next to the system name'}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange('BANNER')}
                  className={`flex-1 p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-4 text-center ${
                    field.value === 'BANNER'
                      ? 'border-operational-cyan bg-operational-cyan/5 shadow-[0_0_20px_rgba(var(--operational-cyan-rgb),0.1)]'
                      : 'border-border bg-card hover:bg-muted'
                  }`}
                >
                  <LayoutTemplate className={`w-8 h-8 ${field.value === 'BANNER' ? 'text-operational-cyan' : 'text-muted-foreground'}`} />
                  <div>
                    <div className="font-bold text-sm text-foreground">{_locale === 'ar' ? 'لافتة' : 'Banner (Full-width)'}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {_locale === 'ar' ? 'شعار بعرض كامل ولا يعرض اسم النظام' : 'Full-width logo banner, hides the system name'}
                    </div>
                  </div>
                </button>
              </div>
            )}
          />
        </div>
      </div>

      {/* Identity Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-foreground border-b border-border pb-2 mb-4">
          {t('sections.identity')}
        </h3>

        <div className="w-full flex flex-col gap-6">
          <div className="w-full min-w-0 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground text-start">
              {t('fields.name')}
            </label>
            <div className="relative">
              <Building2 className="absolute end-3 top-2.5 w-4 h-4 text-muted-foreground/40" />
              <Input 
                {...register('name')}
                placeholder={t('placeholders.name')}
                className={`w-full h-10 ps-4 pe-10 text-start bg-background border rounded-lg focus:ring-1 focus:ring-brand-gold outline-none transition-all ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-border'}`}
              />
            </div>
            {errors.name && <p className="text-xs text-red-500 mt-1">{tv(errors.name.message as never)}</p>}
          </div>

          <div className="w-full min-w-0 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground text-start">
              {t('fields.address')}
            </label>
            <div className="relative">
              <MapPin className="absolute end-3 top-3 w-4 h-4 text-muted-foreground/40" />
              <Textarea 
                {...register('address')}
                placeholder={t('placeholders.address')}
                className={`w-full text-start ps-4 pe-10 pt-3 resize-none min-h-[100px] bg-background border rounded-lg focus:ring-1 focus:ring-brand-gold outline-none transition-all ${errors.address ? 'border-red-500 focus:ring-red-500' : 'border-border'}`}
              />
            </div>
            {errors.address && <p className="text-xs text-red-500 mt-1">{tv(errors.address.message as never)}</p>}
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-foreground border-b border-border pb-2 mb-4">
          {t('sections.contact')}
        </h3>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="w-full min-w-0 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground text-start">
              {t('fields.phone')}
            </label>
            <div className="relative">
              <Phone className="absolute end-3 top-2.5 w-4 h-4 text-muted-foreground/40" />
              <Input 
                {...register('phone')}
                placeholder={t('placeholders.phone')}
                className={`w-full h-10 ps-4 pe-10 text-start bg-background border rounded-lg focus:ring-1 focus:ring-brand-gold outline-none transition-all font-mono ${errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-border'}`}
              />
            </div>
            {errors.phone && <p className="text-xs text-red-500 mt-1">{tv(errors.phone.message as never)}</p>}
          </div>

          <div className="w-full min-w-0 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground text-start">
              {t('fields.email')}
            </label>
            <div className="relative">
              <Mail className="absolute end-3 top-2.5 w-4 h-4 text-muted-foreground/40" />
              <Input 
                {...register('email')}
                placeholder={t('placeholders.email')}
                className={`w-full h-10 ps-4 pe-10 text-start bg-background border rounded-lg focus:ring-1 focus:ring-brand-gold outline-none transition-all ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-border'}`}
              />
            </div>
            {errors.email && <p className="text-xs text-red-500 mt-1">{tv(errors.email.message as never)}</p>}
          </div>
        </div>
      </div>

      {/* Legal/Official Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-foreground border-b border-border pb-2 mb-4">
          {t('sections.legal')}
        </h3>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="w-full min-w-0 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground text-start">
              {t('fields.tax_number')}
            </label>
            <div className="relative">
              <FileText className="absolute end-3 top-2.5 w-4 h-4 text-muted-foreground/40" />
              <Input 
                {...register('taxNumber')}
                className="w-full h-10 ps-4 pe-10 text-start bg-background border border-border rounded-lg focus:ring-1 focus:ring-brand-gold outline-none transition-all font-mono"
              />
            </div>
          </div>

          <div className="w-full min-w-0 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground text-start">
              {t('fields.commercial_registration')}
            </label>
            <div className="relative">
              <FileText className="absolute end-3 top-2.5 w-4 h-4 text-muted-foreground/40" />
              <Input 
                {...register('commercialRegistration')}
                className="w-full h-10 ps-4 pe-10 text-start bg-background border border-border rounded-lg focus:ring-1 focus:ring-brand-gold outline-none transition-all font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Action Bar */}
      <div className="mt-8 pt-6 border-t border-border flex items-center justify-end gap-3">
        <Button 
          variant="outline" 
          type="button" 
          disabled={isPending || !isDirty}
          onClick={() => profile && reset(profile)}
          className="px-6 border-border hover:bg-muted"
        >
          {_locale === 'ar' ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button 
          type="button" 
          onClick={handleSubmit(onSubmit, onFormError)}
          disabled={isPending || !isDirty}
          className="px-8 bg-brand-gold hover:bg-brand-gold-hover text-white shadow-md shadow-brand-gold/20 font-bold flex items-center gap-2"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isPending 
            ? tCommon('saving') 
            : (_locale === 'ar' ? 'حفظ التغييرات' : 'Save Changes')}
        </Button>
      </div>
    </div>
  </div>
 </div>
 );
}
