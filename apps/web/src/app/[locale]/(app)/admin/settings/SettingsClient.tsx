'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Settings, 
  Mail, 
  Globe, 
  AlertTriangle, 
  Save, 
  ArrowLeft, 
  Loader2, 
  Lightbulb, 
  Zap, 
  Sliders,
  ShieldAlert,
  ServerCrash,
  Activity,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { Link } from '@/i18n/navigation';
import { useAdminSettings, useUpdateSettings, AdminSettingsSchema, type AdminSettings } from '@/features/admin/hooks/useAdminSettings';
import { useCurrencies } from '@/features/currencies/hooks/useCurrencies';
import { type Currency } from '@/types/master-data';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';

export function SettingsClient({ locale }: { locale: string }) {
  const t = useTranslations('admin.settings');
  const tCommon = useTranslations('common');
  const { data: currentSettings, isLoading } = useAdminSettings();
  const { mutateAsync: updateSettings, isPending } = useUpdateSettings();
  const { playSound } = useAudioFeedback();
  const { data: currencies, isLoading: loadingCurrencies } = useCurrencies();
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingData, setPendingData] = useState<AdminSettings | null>(null);

  const { register, handleSubmit, formState: { errors, isDirty }, control, setValue, reset } = useForm<AdminSettings>({
    resolver: zodResolver(AdminSettingsSchema),
    values: currentSettings,
  });

  const { router: _guardedRouter } = useUnsavedChangesGuard(isDirty);

  const watchedBaseCurrency = useWatch({ control, name: 'baseCurrency' });
  const watchedLanguage = useWatch({ control, name: 'localeDefault' });
  const initialBaseCurrency = currentSettings?.baseCurrency || null;

  const showCurrencyWarning = watchedBaseCurrency && initialBaseCurrency && watchedBaseCurrency !== initialBaseCurrency;

  const onSubmit = async (data: AdminSettings) => {
    if (data.baseCurrency !== initialBaseCurrency) {
      setPendingData(data);
      setIsConfirmOpen(true);
    } else {
      try {
        await updateSettings(data);
        reset(data);
        playSound('success');
        toast.success(t('save_success') || 'Settings saved successfully');
      } catch (err) {
        playSound('error');
        // Managed by hooks
      }
    }
  };

  const handleConfirm = async () => {
    if (pendingData) {
      try {
        await updateSettings(pendingData);
        reset(pendingData);
        setIsConfirmOpen(false);
        setPendingData(null);
        playSound('success');
        toast.success(t('save_success') || 'Settings saved successfully');
      } catch (err) {
        playSound('error');
        // Managed by hooks
      }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-pulse">
        <div className="h-12 w-64 bg-surface-container-highest rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="h-48 bg-surface-container-highest rounded-[2.5rem]" />
            <div className="h-32 bg-surface-container-highest rounded-[2.5rem]" />
          </div>
          <div className="lg:col-span-8 h-[500px] bg-surface-container-highest rounded-[2.5rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 relative">
      {/* Premium background decorative glow elements */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-operational-cyan/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 left-10 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[160px] pointer-events-none -z-10" />
      
      {/* Return to Admin Breadcrumb & Page Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-4">
          <Link 
            href="/admin"
            data-skip-guard="true"
            className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-operational-cyan transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
            {t('return_to_admin')}
          </Link>
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-operational-cyan/10 rounded-2xl border border-operational-cyan/20 shadow-[0_0_25px_rgba(var(--operational-cyan-rgb),0.1)]">
                <Settings className="w-7 h-7 text-operational-cyan" />
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/75">
                  {t('settings_title')}
                </h1>
                <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-[0.2em] mt-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-operational-cyan animate-pulse" />
                  Operational Configuration & Global Parameters
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT PANEL / BENTO COLUMN (System Telemetry & Parameters) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Bento Grid Item 1: Engine Status (Translucent Glassmorphic Card) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 rounded-[2.5rem] bg-surface-container-low/60 backdrop-blur-lg border border-white/10 space-y-6 relative overflow-hidden group shadow-2xl transition-all duration-300 hover:border-operational-cyan/20"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 group-hover:opacity-[0.06] transition-all duration-700 pointer-events-none">
                <Zap className="w-40 h-40 text-operational-cyan" />
              </div>
              
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  System State
                </h3>
                <Activity className="w-4 h-4 text-operational-cyan animate-pulse" />
              </div>

              <div className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="relative flex shrink-0">
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping absolute opacity-75" />
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 relative shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-emerald-500">
                    Engine Online
                  </p>
                  <p className="text-[9px] text-muted-foreground/60 uppercase font-semibold tracking-wider">
                    Config Loaded Successfully
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-[10px] uppercase font-bold text-muted-foreground/50 tracking-wider">
                <div className="p-3 bg-surface-container-lowest/50 rounded-xl border border-white/5">
                  <span className="block text-muted-foreground/30 text-[8px] mb-1">Environment</span>
                  <span className="text-foreground/80 font-mono">Production</span>
                </div>
                <div className="p-3 bg-surface-container-lowest/50 rounded-xl border border-white/5">
                  <span className="block text-muted-foreground/30 text-[8px] mb-1">Vitals</span>
                  <span className="text-operational-cyan font-mono">99.98% OK</span>
                </div>
              </div>
            </motion.div>

            {/* Bento Grid Item 2: Base Currency Impact warning (Cyan theme warning card) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-8 rounded-[2.5rem] bg-operational-cyan/5 border border-operational-cyan/15 space-y-4 shadow-xl backdrop-blur-md relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none">
                <ShieldAlert className="w-24 h-24 text-operational-cyan" />
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-operational-cyan/10 rounded-xl border border-operational-cyan/20 shadow-[0_0_15px_rgba(var(--operational-cyan-rgb),0.1)]">
                  <Lightbulb className="w-5 h-5 text-operational-cyan" />
                </div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">
                  Base Currency Impact
                </h3>
              </div>
              <p className="text-[10px] text-muted-foreground/80 leading-relaxed uppercase font-semibold text-muted-foreground/60 tracking-wider">
                Changing your base currency will affect existing unit pricing, reports, and purchase orders. Make sure you complete outstanding stocktake reconciliations prior to changing currency.
              </p>
            </motion.div>

            {/* Bento Grid Item 3: Dynamic Cog Art / Configuration Info */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-8 rounded-[2.5rem] bg-surface-container-low/40 border border-white/5 relative h-48 overflow-hidden group shadow-lg backdrop-blur-sm"
            >
              <div className="absolute inset-0 opacity-5 group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
                <Sliders className="w-full h-full scale-150 text-operational-cyan rotate-[40deg] group-hover:rotate-[60deg] transition-transform duration-[1200ms]" />
              </div>
              <div className="relative h-full flex flex-col justify-end">
                <div className="flex items-center gap-2 mb-2">
                  <ServerCrash className="w-3.5 h-3.5 text-white/40" />
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                    System Parameters
                  </h3>
                </div>
                <p className="text-[10px] text-white/30 leading-relaxed font-bold uppercase tracking-wider">
                  Synchronized core properties across procurement, in-app notifications, and localized multi-warehouse registers.
                </p>
              </div>
            </motion.div>
          </div>

          {/* RIGHT PANEL / BENTO COLUMN (Form Configuration Clustered Bento Grid) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Bento Grid Item 4: General Settings Section (Glassmorphic Container Card) */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="p-8 md:p-10 rounded-[2.5rem] bg-surface-container-low/60 backdrop-blur-lg border border-white/10 shadow-2xl space-y-10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-80 h-80 bg-operational-cyan/5 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="flex items-center gap-4.5 border-b border-white/5 pb-6">
                <div className="p-3 bg-operational-cyan/10 rounded-2xl border border-operational-cyan/20">
                  <Globe className="w-5 h-5 text-operational-cyan" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground uppercase tracking-widest">
                    {t('general_section')}
                  </h3>
                  <p className="text-[9px] text-muted-foreground/50 uppercase font-bold tracking-widest mt-1">
                    Manage core localized settings and brand names
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* System Name Input Block */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 ml-1">
                    {t('system_name')}
                  </Label>
                  <div className="relative group">
                    <Input
                      {...register('systemName')}
                      className={cn(
                        "h-14 font-bold bg-surface-container-lowest/80 border border-outline-low rounded-2xl px-5 focus-visible:ring-operational-cyan focus-visible:border-operational-cyan transition-all text-sm shadow-inner group-hover:border-white/20 focus:shadow-[0_0_20px_rgba(var(--operational-cyan-rgb),0.1)]",
                        errors.systemName ? "border-status-error focus-visible:ring-status-error" : ""
                      )}
                    />
                  </div>
                  {errors.systemName && (
                    <p className="text-[10px] font-bold text-status-error uppercase ml-1 flex items-center gap-1.5 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {errors.systemName.message}
                    </p>
                  )}
                </div>

                {/* Default Language Select Block */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 ml-1">
                    {t('default_language')}
                  </Label>
                  <Select 
                    onValueChange={(val) => setValue('localeDefault', val as 'en' | 'ar', { shouldDirty: true })}
                    value={watchedLanguage}
                  >
                    <SelectTrigger className="h-14 bg-surface-container-lowest/80 border border-outline-low rounded-2xl px-5 font-bold transition-all hover:border-operational-cyan/20 text-sm focus:border-operational-cyan focus:ring-1 focus:ring-operational-cyan">
                      <SelectValue placeholder={t('select_language')} />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-container-lowest border-outline-low rounded-xl backdrop-blur-xl">
                      <SelectItem value="en" className="rounded-lg">{tCommon('locales.en')}</SelectItem>
                      <SelectItem value="ar" className="rounded-lg">{tCommon('locales.ar')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Base Currency Select Block */}
                <div className="space-y-3 md:col-span-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 ml-1">
                    {t('base_currency')}
                  </Label>
                  <Select 
                    onValueChange={(val) => setValue('baseCurrency', val as string, { shouldDirty: true })}
                    value={watchedBaseCurrency}
                    disabled={currentSettings?.hasTransactions}
                  >
                    <SelectTrigger className="h-14 bg-surface-container-lowest/80 border border-outline-low rounded-2xl px-5 font-bold transition-all hover:border-operational-cyan/20 text-sm focus:border-operational-cyan focus:ring-1 focus:ring-operational-cyan disabled:opacity-50 disabled:cursor-not-allowed">
                      <SelectValue placeholder={t('select_currency')} />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-container-lowest border border-outline-low rounded-xl max-h-60 backdrop-blur-xl">
                      {loadingCurrencies ? (
                        <div className="p-3 text-label-xs animate-pulse uppercase text-muted-foreground tracking-widest">Loading...</div>
                      ) : (
                        currencies?.map((c: Currency) => (
                          <SelectItem key={c.id} value={c.code} className="rounded-lg">
                            {c.code} — {c[(`name_${locale}` as keyof typeof c)]}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dynamic Currency Impact Alert Block */}
              <AnimatePresence>
                {showCurrencyWarning && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="p-6 bg-status-warning/5 border border-status-warning/20 rounded-2xl flex items-start gap-4 relative overflow-hidden"
                  >
                    <div className="w-10 h-10 rounded-full bg-status-warning/10 flex items-center justify-center border border-status-warning/20 shrink-0 mt-0.5 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                      <AlertTriangle className="w-5 h-5 text-status-warning animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-status-warning">
                        {t('impact_warning_title')}
                      </h3>
                      <p className="text-[10px] text-status-warning/80 font-bold uppercase leading-relaxed tracking-wider">
                        {t('base_currency_warning')}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Bento Grid Item 5: Email Relay Settings Section (Glassmorphic Container Card) */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-8 md:p-10 rounded-[2.5rem] bg-surface-container-low/60 backdrop-blur-lg border border-white/10 shadow-2xl space-y-10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="flex items-center gap-4.5 border-b border-white/5 pb-6">
                <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <Mail className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground uppercase tracking-widest">
                    {t('email_section')}
                  </h3>
                  <p className="text-[9px] text-muted-foreground/50 uppercase font-bold tracking-widest mt-1">
                    SMTP server notification headers and identity
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Sender Name Input Block */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 ml-1">
                    {t('sender_name')}
                  </Label>
                  <div className="relative group">
                    <Input
                      {...register('senderName')}
                      className={cn(
                        "h-14 font-bold bg-surface-container-lowest/80 border border-outline-low rounded-2xl px-5 focus-visible:ring-operational-cyan focus-visible:border-operational-cyan transition-all text-sm shadow-inner group-hover:border-white/20 focus:shadow-[0_0_20px_rgba(var(--operational-cyan-rgb),0.1)]",
                        errors.senderName ? "border-status-error focus-visible:ring-status-error" : ""
                      )}
                    />
                  </div>
                  {errors.senderName && (
                    <p className="text-[10px] font-bold text-status-error uppercase ml-1 flex items-center gap-1.5 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {errors.senderName.message}
                    </p>
                  )}
                </div>

                {/* Reply-To Email Input Block */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 ml-1">
                    {t('reply_to_email')}
                  </Label>
                  <div className="relative group">
                    <Input
                      {...register('replyToEmail')}
                      dir="ltr"
                      className={cn(
                        "h-14 font-bold bg-surface-container-lowest/80 border border-outline-low rounded-2xl px-5 focus-visible:ring-operational-cyan focus-visible:border-operational-cyan transition-all text-sm shadow-inner group-hover:border-white/20 focus:shadow-[0_0_20px_rgba(var(--operational-cyan-rgb),0.1)]",
                        errors.replyToEmail ? "border-status-error focus-visible:ring-status-error" : ""
                      )}
                    />
                  </div>
                  {errors.replyToEmail && (
                    <p className="text-[10px] font-bold text-status-error uppercase ml-1 flex items-center gap-1.5 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {errors.replyToEmail.message}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Bento Grid Item 6: Print Settings Section (Glassmorphic Container Card) */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-8 md:p-10 rounded-[2.5rem] bg-surface-container-low/60 backdrop-blur-lg border border-white/10 shadow-2xl space-y-10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-80 h-80 bg-operational-cyan/5 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="flex items-center gap-4.5 border-b border-white/5 pb-6">
                <div className="p-3 bg-operational-cyan/10 rounded-2xl border border-operational-cyan/20">
                  <Printer className="w-5 h-5 text-operational-cyan" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground uppercase tracking-widest">
                    {t('print_section')}
                  </h3>
                  <p className="text-[9px] text-muted-foreground/50 uppercase font-bold tracking-widest mt-1">
                    Manage default document sizes and receipt formats
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Default Paper Size Select Block */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 ml-1">
                    {t('paper_size')}
                  </Label>
                  <Select 
                    onValueChange={(val) => setValue('printSettings.defaultPaperSize', val as 'A4' | '80mm' | '58mm', { shouldDirty: true })}
                    value={useWatch({ control, name: 'printSettings.defaultPaperSize' }) || 'A4'}
                  >
                    <SelectTrigger className="h-14 bg-surface-container-lowest/80 border border-outline-low rounded-2xl px-5 font-bold transition-all hover:border-operational-cyan/20 text-sm focus:border-operational-cyan focus:ring-1 focus:ring-operational-cyan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-container-lowest border-outline-low rounded-xl backdrop-blur-xl">
                      <SelectItem value="A4" className="rounded-lg">A4 Standard</SelectItem>
                      <SelectItem value="80mm" className="rounded-lg">Thermal 80mm</SelectItem>
                      <SelectItem value="58mm" className="rounded-lg">Thermal 58mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Show Logo on Receipt */}
                <div className="flex items-center justify-between p-4 bg-surface-container-lowest/40 rounded-2xl border border-outline-low h-14">
                  <Label htmlFor="thermal-show-logo" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 cursor-pointer select-none">
                    {t('show_logo')}
                  </Label>
                  <Switch
                    id="thermal-show-logo"
                    checked={useWatch({ control, name: 'printSettings.thermalShowLogo' }) ?? true}
                    onCheckedChange={(val) => setValue('printSettings.thermalShowLogo', val, { shouldDirty: true })}
                  />
                </div>

                {/* Auto Print on Fulfill */}
                <div className="flex items-center justify-between p-4 bg-surface-container-lowest/40 rounded-2xl border border-outline-low h-14 md:col-span-2">
                  <Label htmlFor="auto-print-fulfill" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 cursor-pointer select-none">
                    {t('auto_print')}
                  </Label>
                  <Switch
                    id="auto-print-fulfill"
                    checked={useWatch({ control, name: 'printSettings.autoPrintOnFulfill' }) ?? false}
                    onCheckedChange={(val) => setValue('printSettings.autoPrintOnFulfill', val, { shouldDirty: true })}
                  />
                </div>

              </div>
            </motion.div>

            {/* Bottom Form Actions (Floating Glassmorphic Panel Bar) */}
            <div className="flex items-center justify-end gap-4 p-4 rounded-3xl bg-surface-container-low/40 backdrop-blur-md border border-white/5 shadow-lg">
              <motion.div
                whileHover={isDirty ? { scale: 1.02 } : {}}
                whileTap={isDirty ? { scale: 0.98 } : {}}
              >
                <Button
                  type="submit"
                  disabled={isPending || !isDirty}
                  className="h-14 px-10 bg-gradient-to-r from-operational-cyan to-cyan-400 text-black hover:brightness-110 transition-all font-extrabold uppercase text-[10px] tracking-widest gap-3 rounded-2xl shadow-[0_10px_30px_rgba(var(--operational-cyan-rgb),0.25)] disabled:opacity-50 disabled:shadow-none disabled:bg-none disabled:bg-muted"
                >
                  {isPending ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
                  {tCommon('save')}
                </Button>
              </motion.div>
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
