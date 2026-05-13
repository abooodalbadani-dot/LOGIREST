'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Settings, Mail, Globe, AlertTriangle, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { Link } from '@/i18n/navigation';
import { useAdminSettings, useUpdateSettings, AdminSettingsSchema, type AdminSettings } from '@/features/admin/hooks/useAdminSettings';
import { useCurrencies } from '@/features/currencies/hooks/useCurrencies';
import { type Currency } from '@/types/master-data';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';

export function SettingsClient({ locale }: { locale: string }) {
  const t = useTranslations('admin.settings');
  const tCommon = useTranslations('common');
  const { data: currentSettings, isLoading } = useAdminSettings();
  const { mutateAsync: updateSettings, isPending } = useUpdateSettings();
  const { data: currencies, isLoading: loadingCurrencies } = useCurrencies();
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingData, setPendingData] = useState<AdminSettings | null>(null);

  const { register, handleSubmit, formState: { errors, isDirty }, control, setValue, reset } = useForm<AdminSettings>({
    resolver: zodResolver(AdminSettingsSchema),
    values: currentSettings,
  });

  const { router: _guardedRouter } = useUnsavedChangesGuard(isDirty);

  const watchedBaseCurrency = useWatch({ control, name: 'base_currency' });
  const watchedLanguage = useWatch({ control, name: 'locale_default' });
  const initialBaseCurrency = currentSettings?.base_currency || null;

  const showCurrencyWarning = watchedBaseCurrency && initialBaseCurrency && watchedBaseCurrency !== initialBaseCurrency;

  const onSubmit = (data: AdminSettings) => {
  if (data.base_currency !== initialBaseCurrency) {
  setPendingData(data);
  setIsConfirmOpen(true);
} else {
      updateSettings(data);
      reset(data);
    }
  };

const handleConfirm = () => {
    if (pendingData) {
      updateSettings(pendingData);
      reset(pendingData);
      setIsConfirmOpen(false);
  setPendingData(null);
  }
  };

  if (isLoading) {
  return (
  <div className="p-8 space-y-8 animate-pulse">
  <div className="h-8 w-64 bg-surface-container-highest rounded-sm" />
  <div className="space-y-4">
  <div className="h-32 w-full bg-surface-container-highest rounded-sm" />
  <div className="h-32 w-full bg-surface-container-highest rounded-sm" />
  </div>
  </div>
  );
  }

  return (
  <div className="max-w-4xl mx-auto p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
  <div className="flex flex-col gap-4 border-b border-outline-low pb-8">
<Link 
        href="/admin"
        data-skip-guard="true"
  className="inline-flex items-center gap-2 text-label-xs font-semibold uppercase text-muted-foreground hover:text-operational-cyan transition-colors"
 >
 <ArrowLeft className="w-3 h-3 rtl:rotate-180" />
 {t('return_to_admin')}
 </Link>
 <div className="flex items-center justify-between">
 <div className="space-y-1">
 <h1 className="text-headline-lg font-semibold uppercase text-foreground flex items-center gap-4">
 <Settings className="w-10 h-10 text-operational-cyan" />
 {t('settings_title')}
 </h1>
 <p className="text-label-sm text-muted-foreground/60 uppercase font-bold">
 Operational Configuration & Global Parameters
 </p>
 </div>
 <Button
 onClick={handleSubmit(onSubmit)}
 disabled={isPending}
 className="h-12 px-8 bg-operational-cyan text-white hover:bg-operational-cyan/90 transition-all font-semibold uppercase text-label-xs gap-2 rounded-sm shadow-[0_0_20px_rgba(var(--operational-cyan-rgb),0.2)]"
 >
 <Save className="w-4 h-4" />
 {tCommon('save')}
 </Button>
 </div>
 </div>

 <form className="space-y-12">
 {/* General Settings */}
 <div className="space-y-6">
 <div className="flex items-center gap-3 border-s-4 border-operational-cyan ps-4">
 <Globe className="w-5 h-5 text-operational-cyan" />
 <h2 className="text-body-md font-semibold uppercase text-foreground">
 {t('general_section')}
 </h2>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-2">
 <Label className="text-label-xs font-semibold uppercase text-muted-foreground">
 {t('system_name')}
 </Label>
 <Input
 {...register('system_name')}
 className={`bg-surface-container-low border-outline-low rounded-sm h-12 font-bold focus:ring-1 focus:ring-operational-cyan ${errors.system_name ? 'border-status-error' : ''}`}
 />
 {errors.system_name && (
 <p className="text-label-xs font-bold text-status-error uppercase">{errors.system_name.message}</p>
 )}
 </div>

 <div className="space-y-2">
 <Label className="text-label-xs font-semibold uppercase text-muted-foreground">
 {t('default_language')}
 </Label>
 <Select 
 onValueChange={(val) => setValue('locale_default', val as 'en' | 'ar')}
 value={watchedLanguage}
 >
 <SelectTrigger className="bg-surface-container-low border-outline-low rounded-sm h-12 font-bold focus:ring-1 focus:ring-operational-cyan">
 <SelectValue placeholder={t('select_language')} />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-low border-outline-low rounded-sm">
 <SelectItem value="en">{tCommon('locales.en')}</SelectItem>
 <SelectItem value="ar">{tCommon('locales.ar')}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label className="text-label-xs font-semibold uppercase text-muted-foreground">
 {t('base_currency')}
 </Label>
 <Select 
 onValueChange={(val) => setValue('base_currency', val as string)}
 value={watchedBaseCurrency}
 >
 <SelectTrigger className="bg-surface-container-low border-outline-low rounded-sm h-12 font-bold focus:ring-1 focus:ring-operational-cyan">
 <SelectValue placeholder={t('select_currency')} />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-low border-outline-low rounded-sm">
    {loadingCurrencies ? (
      <div className="p-2 text-label-xs animate-pulse uppercase text-muted-foreground">Loading...</div>
    ) : (
      currencies?.map((c: Currency) => (
        <SelectItem key={c.id} value={c.code}>
          {c.code} — {c[(`name_${locale}` as keyof typeof c)]}
        </SelectItem>
      ))
    )}
 </SelectContent>
 </Select>
 </div>
 </div>

 {showCurrencyWarning && (
 <div className="p-6 bg-status-warning/5 border border-status-warning/20 rounded-sm flex items-center gap-6 animate-in fade-in zoom-in-95 duration-300">
 <div className="w-12 h-12 rounded-full bg-status-warning/10 flex items-center justify-center border border-status-warning/20 shrink-0">
 <AlertTriangle className="w-6 h-6 text-status-warning" />
 </div>
 <div className="space-y-1">
 <h3 className="text-label-sm font-semibold uppercase text-status-warning">
 {t('impact_warning_title')}
 </h3>
 <p className="text-label-xs text-status-warning/80 font-bold uppercase leading-relaxed">
 {t('base_currency_warning')}
 </p>
 </div>
 </div>
 )}
 </div>

 {/* Email Settings */}
 <div className="space-y-6">
 <div className="flex items-center gap-3 border-s-4 border-operational-cyan ps-4">
 <Mail className="w-5 h-5 text-operational-cyan" />
 <h2 className="text-body-md font-semibold uppercase text-foreground">
 {t('email_section')}
 </h2>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-2">
 <Label className="text-label-xs font-semibold uppercase text-muted-foreground">
 {t('sender_name')}
 </Label>
 <Input
 {...register('sender_name')}
 className={`bg-surface-container-low border-outline-low rounded-sm h-12 font-bold focus:ring-1 focus:ring-operational-cyan ${errors.sender_name ? 'border-status-error' : ''}`}
 />
 {errors.sender_name && (
 <p className="text-label-xs font-bold text-status-error uppercase">{errors.sender_name.message}</p>
 )}
 </div>

 <div className="space-y-2">
 <Label className="text-label-xs font-semibold uppercase text-muted-foreground">
 {t('reply_to_email')}
 </Label>
 <Input
 {...register('reply_to_email')}
 dir="ltr"
 className={`bg-surface-container-low border-outline-low rounded-sm h-12 font-bold focus:ring-1 focus:ring-operational-cyan ${errors.reply_to_email ? 'border-status-error' : ''}`}
 />
 {errors.reply_to_email && (
 <p className="text-label-xs font-bold text-status-error uppercase">{errors.reply_to_email.message}</p>
 )}
 </div>
 </div>
 </div>
 </form>

 <PostConfirmDialog
 open={isConfirmOpen}
 onOpenChange={setIsConfirmOpen}
 onConfirm={handleConfirm}
 title={t('confirm_base_currency_title')}
 description={t('confirm_base_currency_warning')}
 confirmText={tCommon('save')}
 variant="destructive"
 />
 </div>
 );
}
