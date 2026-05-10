'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
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
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';

export function ProfileFormClient({ locale }: { locale: string }) {
 const t = useTranslations('admin.restaurant_profile');
 const tCommon = useTranslations('common');
 const { data: profile, isLoading } = useRestaurantProfile();
 const { mutateAsync: updateProfile, isPending } = useUpdateRestaurantProfile();
 
const { register, handleSubmit, formState: { errors, isDirty }, reset, setValue, control } = useForm<RestaurantProfile>({
  resolver: zodResolver(RestaurantProfileSchema),
  });

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

 const logoPreview = useWatch({ control, name: 'logo' });

 useEffect(() => {
 if (profile) {
 reset(profile);
 }
 }, [profile, reset]);

 const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 const reader = new FileReader();
 reader.onloadend = () => {
 const base64 = reader.result as string;
 setValue('logo', base64, { shouldDirty: true });
 };
 reader.readAsDataURL(file);
 }
 };

 const removeLogo = () => {
 setValue('logo', '', { shouldDirty: true });
 };

const onSubmit = async (data: RestaurantProfile) => {
    try {
      await updateProfile(data);
      reset(data);
    } catch {
      // Error handled by mutation hooks
    }
  };

 if (isLoading) {
 return (
 <div className="space-y-8 animate-pulse">
 <div className="h-32 bg-surface-container-highest rounded-[var(--radius)] w-full" />
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
 <Button
 onClick={handleSubmit(onSubmit)}
 disabled={isPending || !isDirty}
 className="h-12 px-8 bg-operational-cyan text-white hover:bg-operational-cyan/90 transition-all font-semibold uppercase text-label-xs gap-2 rounded-[var(--radius)] shadow-[0_0_20px_rgba(var(--operational-cyan-rgb),0.2)] disabled:opacity-50"
 >
 {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
 {isPending ? tCommon('saving') : tCommon('save')}
 </Button>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
 {/* Left Column: Logo and Branding */}
 <div className="space-y-8">
 <div className="space-y-4">
 <Label className="text-label-xs font-semibold uppercase text-muted-foreground">
 {t('fields.logo')}
 </Label>
 <div className="relative group aspect-square rounded-[var(--radius)] border-2 border-dashed border-outline-low hover:border-operational-cyan transition-all overflow-hidden flex flex-col items-center justify-center bg-surface-container-lowest">
 {logoPreview ? (
 <>
 <img src={logoPreview} alt={t('placeholders.logo_alt')} className="w-full h-full object-contain p-4" />
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
 <span className="text-label-xs font-bold text-muted-foreground uppercase">
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
 <p className="text-label-xxs text-muted-foreground italic leading-relaxed">
 {t('logo_hint')}
 </p>
 </div>
 </div>

 {/* Middle and Right Columns: Form Fields */}
 <div className="lg:col-span-2 space-y-10">
 {/* Identity Section */}
 <div className="space-y-6">
 <div className="flex items-center gap-4">
 <div className="h-px flex-1 bg-gradient-to-r from-transparent to-operational-cyan/20" />
 <span className="text-label-xs font-semibold uppercase">
 {t('sections.identity')}
 </span>
 </div>

 <div className="grid grid-cols-1 gap-6">
 <div className="space-y-2">
 <Label className="text-label-xs font-semibold uppercase">
 {t('fields.name')}
 </Label>
 <div className="relative">
 <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
 <Input 
 {...register('name')}
 placeholder={t('placeholders.name')}
 className="pl-10 font-bold placeholder:text-muted-foreground/20"
 />
 </div>
 {errors.name && <p className="text-label-xs text-red-500 font-bold uppercase">{errors.name.message}</p>}
 </div>

 <div className="space-y-2">
 <Label className="text-label-xs font-semibold uppercase">
 {t('fields.address')}
 </Label>
 <div className="relative">
 <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/40" />
 <Textarea 
 {...register('address')}
 placeholder={t('placeholders.address')}
 className="min-h-[100px] pl-10 pt-3 font-bold placeholder:text-muted-foreground/20 resize-none"
 />
 </div>
 {errors.address && <p className="text-label-xs text-red-500 font-bold uppercase">{errors.address.message}</p>}
 </div>
 </div>
 </div>

 {/* Contact Section */}
 <div className="space-y-6">
 <div className="flex items-center gap-4">
 <div className="h-px flex-1 bg-gradient-to-r from-transparent to-operational-cyan/20" />
 <span className="text-label-xs font-semibold uppercase">
 {t('sections.contact')}
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <Label className="text-label-xs font-semibold uppercase">
 {t('fields.phone')}
 </Label>
 <div className="relative">
 <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
 <Input 
 {...register('phone')}
 dir="ltr"
 placeholder={t('placeholders.phone')}
 className="pl-10 font-mono font-bold placeholder:text-muted-foreground/20"
 />
 </div>
 {errors.phone && <p className="text-label-xs text-red-500 font-bold uppercase">{errors.phone.message}</p>}
 </div>

 <div className="space-y-2">
 <Label className="text-label-xs font-semibold uppercase">
 {t('fields.email')}
 </Label>
 <div className="relative">
 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
 <Input 
 {...register('email')}
 dir="ltr"
 placeholder={t('placeholders.email')}
 className="pl-10 font-bold placeholder:text-muted-foreground/20"
 />
 </div>
 {errors.email && <p className="text-label-xs text-red-500 font-bold uppercase">{errors.email.message}</p>}
 </div>
 </div>
 </div>

 {/* Legal/Official Section */}
 <div className="space-y-6">
 <div className="flex items-center gap-4">
 <div className="h-px flex-1 bg-gradient-to-r from-transparent to-operational-cyan/20" />
 <span className="text-label-xs font-semibold uppercase">
 {t('sections.legal')}
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <Label className="text-label-xs font-semibold uppercase">
 {t('fields.tax_number')}
 </Label>
 <div className="relative">
 <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
 <Input 
 {...register('tax_number')}
 dir="ltr"
 className="pl-10 font-mono font-bold"
 />
 </div>
 </div>

 <div className="space-y-2">
 <Label className="text-label-xs font-semibold uppercase">
 {t('fields.commercial_registration')}
 </Label>
 <div className="relative">
 <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
 <Input 
 {...register('commercial_registration')}
 dir="ltr"
 className="pl-10 font-mono font-bold"
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
