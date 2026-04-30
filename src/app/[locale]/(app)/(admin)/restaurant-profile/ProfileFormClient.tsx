'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  Trash2
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

export function ProfileFormClient() {
  const t = useTranslations('admin.restaurant_profile');
  const tCommon = useTranslations('common');
  const { data: profile, isLoading } = useRestaurantProfile();
  const { mutateAsync: updateProfile, isPending } = useUpdateRestaurantProfile();
  
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isDirty }, reset, setValue } = useForm<RestaurantProfile>({
    resolver: zodResolver(RestaurantProfileSchema),
  });

  useEffect(() => {
    if (profile) {
      reset(profile);
      if (profile.logo) {
        setLogoPreview(profile.logo);
      }
    }
  }, [profile, reset]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        setValue('logo', base64, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setValue('logo', '', { shouldDirty: true });
  };

  const onSubmit = async (data: RestaurantProfile) => {
    await updateProfile(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-32 bg-surface-container-highest rounded-sm w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-20 bg-surface-container-highest rounded-sm w-full" />
          <div className="h-20 bg-surface-container-highest rounded-sm w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header section with minimal branding */}
      <div className="flex items-center justify-between border-b border-outline-low pb-8">
        <div className="space-y-1">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-foreground flex items-center gap-4">
            <Building2 className="w-10 h-10 text-operational-cyan" />
            {t('title')}
          </h1>
          <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.2em] font-bold">
            {t('subtitle')}
          </p>
        </div>
        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={isPending || !isDirty}
          className="h-12 px-8 bg-operational-cyan text-white hover:bg-operational-cyan/90 transition-all font-black uppercase tracking-widest text-[10px] gap-2 rounded-sm shadow-[0_0_20px_rgba(var(--operational-cyan-rgb),0.2)] disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isPending ? tCommon('saving') : tCommon('save')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Logo and Branding */}
        <div className="space-y-8">
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t('fields.logo')}
            </Label>
            <div className="relative group aspect-square rounded-sm border-2 border-dashed border-outline-low hover:border-operational-cyan transition-all overflow-hidden flex flex-col items-center justify-center bg-surface-container-lowest">
              {logoPreview ? (
                <>
                  <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain p-4" />
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
                      onClick={removeLogo}
                      className="text-white hover:text-red-400"
                    >
                      <Trash2 className="w-6 h-6" />
                    </Button>
                  </div>
                </>
              ) : (
                <div 
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  className="flex flex-col items-center gap-4 cursor-pointer"
                >
                  <div className="p-4 bg-surface-container rounded-full">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {t('upload_logo')}
                  </span>
                </div>
              )}
              <input 
                id="logo-upload"
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleLogoChange}
              />
            </div>
            <p className="text-[9px] text-muted-foreground italic leading-relaxed">
              {t('logo_hint')}
            </p>
          </div>
        </div>

        {/* Middle and Right Columns: Form Fields */}
        <div className="lg:col-span-2 space-y-10">
          {/* Identity Section */}
          <div className="space-y-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-operational-cyan/20" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                {t('sections.identity')}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">
                  {t('fields.name')}
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input 
                    {...register('name')}
                    placeholder="Restaurant Name"
                    className="h-12 pl-10 bg-surface-container-lowest border-none rounded-sm font-bold placeholder:text-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-operational-cyan transition-all"
                  />
                </div>
                {errors.name && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">
                  {t('fields.address')}
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/40" />
                  <Textarea 
                    {...register('address')}
                    placeholder={t('placeholders.address')}
                    className="min-h-[100px] pl-10 pt-3 bg-surface-container-lowest border-none rounded-sm font-bold placeholder:text-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-operational-cyan transition-all resize-none"
                  />
                </div>
                {errors.address && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{errors.address.message}</p>}
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="space-y-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-operational-cyan/20" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                {t('sections.contact')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">
                  {t('fields.phone')}
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input 
                    {...register('phone')}
                    dir="ltr"
                    placeholder={t('placeholders.phone')}
                    className="h-12 pl-10 bg-surface-container-lowest border-none rounded-sm font-mono font-bold placeholder:text-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-operational-cyan transition-all"
                  />
                </div>
                {errors.phone && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{errors.phone.message}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">
                  {t('fields.email')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input 
                    {...register('email')}
                    dir="ltr"
                    placeholder={t('placeholders.email')}
                    className="h-12 pl-10 bg-surface-container-lowest border-none rounded-sm font-bold placeholder:text-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-operational-cyan transition-all"
                  />
                </div>
                {errors.email && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{errors.email.message}</p>}
              </div>
            </div>
          </div>

          {/* Legal/Official Section */}
          <div className="space-y-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-operational-cyan/20" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                {t('sections.legal')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">
                  {t('fields.tax_number')}
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input 
                    {...register('tax_number')}
                    dir="ltr"
                    className="h-12 pl-10 bg-surface-container-lowest border-none rounded-sm font-mono font-bold focus-visible:ring-1 focus-visible:ring-operational-cyan transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">
                  {t('fields.commercial_registration')}
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input 
                    {...register('commercial_registration')}
                    dir="ltr"
                    className="h-12 pl-10 bg-surface-container-lowest border-none rounded-sm font-mono font-bold focus-visible:ring-1 focus-visible:ring-operational-cyan transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
