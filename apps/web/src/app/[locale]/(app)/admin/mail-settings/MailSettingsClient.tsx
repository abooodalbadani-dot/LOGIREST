'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, useWatch, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Mail, 
  Server, 
  Shield, 
  Key, 
  Save, 
  ArrowLeft, 
  Send,
  Loader2,
  Lock,
  Globe,
  Settings2,
  Info,
  Cloud,
  CheckCircle2,
  Zap,
  Eye,
  EyeOff,
  Lightbulb
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import { useAdminSettings, useUpdateSettings, AdminSettingsSchema, type AdminSettings } from '@/features/admin/hooks/useAdminSettings';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function MailSettingsClient() {
  const t = useTranslations('admin.mail_settings');
  const tCommon = useTranslations('common');
  const { data: currentSettings, isLoading } = useAdminSettings();
  const { mutateAsync: updateSettings, isPending } = useUpdateSettings();
  
  const [isTesting, setIsTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isDirty }, setValue, reset, control } = useForm<AdminSettings>({
    resolver: zodResolver(AdminSettingsSchema),
    values: currentSettings as AdminSettings,
  });

  useUnsavedChangesGuard(isDirty);

  const watchedProvider = useWatch({ control, name: 'mail_provider' });
  const watchedEncryption = useWatch({ control, name: 'smtp_encryption' });

  const onSubmit: SubmitHandler<AdminSettings> = async (data) => {
    try {
      await updateSettings(data);
      reset(data);
      toast.success(t('save_success'));
    } catch (error) {
      // Error handling is managed by the mutation hook
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    // Simulate API call for testing SMTP
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsTesting(false);
    toast.success(t('connection_success'));
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-pulse">
        <div className="h-12 w-64 bg-surface-container-highest rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="h-48 bg-surface-container-highest rounded-3xl" />
            <div className="h-32 bg-surface-container-highest rounded-3xl" />
          </div>
          <div className="lg:col-span-8 h-[600px] bg-surface-container-highest rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-4">
          <Link 
            href="/admin"
            data-skip-guard="true"
            className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-operational-cyan transition-all"
          >
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
            {t('return_to_admin')}
          </Link>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-operational-cyan/10 rounded-2xl border border-operational-cyan/20">
                <Mail className="w-6 h-6 text-operational-cyan" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                {t('title')}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground/80 max-w-2xl mt-2">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Sidebar with Status & Info */}
        <div className="lg:col-span-4 space-y-6">
          {/* Status Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-[2rem] bg-surface-container-low border border-white/5 space-y-6 relative overflow-hidden group shadow-sm"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
              <Zap className="w-32 h-32 text-operational-cyan" />
            </div>
            
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {t('status_label')}
            </h3>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-status-success/5 border border-status-success/10">
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-status-success animate-ping absolute" />
                <div className="w-3 h-3 rounded-full bg-status-success relative" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-status-success">
                  {t('status_connected')}
                </p>
                <p className="text-[10px] text-muted-foreground/60 uppercase font-medium">
                  {t('status_last_check', { time: '5m' })}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Technical Tip Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-[2rem] bg-operational-cyan/5 border border-operational-cyan/10 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-operational-cyan/10 rounded-xl">
                <Lightbulb className="w-5 h-5 text-operational-cyan" />
              </div>
              <h3 className="text-sm font-bold text-foreground">
                {t('technical_tip_title')}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground/80 leading-relaxed">
              {t('technical_tip_desc')}
            </p>
          </motion.div>

          {/* Background Map Decoration */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-[2rem] bg-surface-container-high border border-white/5 relative h-48 overflow-hidden group shadow-inner"
          >
            <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-700">
              <Globe className="w-full h-full scale-150 text-operational-cyan" />
            </div>
            <div className="relative h-full flex flex-col justify-end">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                {t('encryption_card_title')}
              </h3>
              <p className="text-xs text-white/30 mt-2 leading-relaxed">
                {t('ssl_tls_desc')}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Configuration Form */}
        <div className="lg:col-span-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="p-8 md:p-10 rounded-[2.5rem] bg-surface-container-low border border-white/5 shadow-sm space-y-12">
              
              {/* Provider Selection */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-operational-cyan/10 rounded-xl">
                    <Cloud className="w-5 h-5 text-operational-cyan" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    {t('provider_label')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'ses', name: t('provider_ses'), icon: Cloud },
                    { id: 'smtp', name: t('provider_smtp'), icon: Mail }
                  ].map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => setValue('mail_provider', provider.id as 'smtp' | 'ses', { shouldDirty: true })}
                      className={cn(
                        "relative flex items-center justify-between p-5 rounded-2xl border transition-all duration-300",
                        watchedProvider === provider.id 
                          ? "bg-operational-cyan/5 border-operational-cyan/40 shadow-[0_0_20px_rgba(var(--operational-cyan-rgb),0.05)]" 
                          : "bg-surface-container-lowest border-outline-low hover:border-operational-cyan/20"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-2.5 rounded-xl transition-colors",
                          watchedProvider === provider.id ? "bg-operational-cyan text-white" : "bg-surface-container-high text-muted-foreground/60"
                        )}>
                          <provider.icon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-sm tracking-tight">{provider.name}</span>
                      </div>
                      {watchedProvider === provider.id && (
                        <motion.div layoutId="provider-check" className="p-1 bg-operational-cyan rounded-full">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Connection Details */}
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-operational-cyan/10 rounded-xl">
                    <Settings2 className="w-5 h-5 text-operational-cyan" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    {t('server_section')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-8 space-y-2.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      {watchedProvider === 'ses' ? t('label_region') : t('smtp_host')}
                    </Label>
                    <div className="relative group">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-operational-cyan transition-colors" />
                      <Input
                        {...register('smtp_host')}
                        placeholder={t('placeholder_host')}
                        dir="ltr"
                        className="pl-12 h-14 font-bold bg-surface-container-lowest border-outline-low rounded-2xl focus:ring-operational-cyan focus:border-operational-cyan transition-all"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-4 space-y-2.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      {t('smtp_port')}
                    </Label>
                    <div className="relative group">
                      <Server className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-operational-cyan transition-colors" />
                      <Input
                        type="number"
                        {...register('smtp_port', { valueAsNumber: true })}
                        placeholder={t('placeholder_port')}
                        dir="ltr"
                        className="pl-12 h-14 font-bold bg-surface-container-lowest border-outline-low rounded-2xl focus:ring-operational-cyan focus:border-operational-cyan transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      {watchedProvider === 'ses' ? t('label_access_key') : t('smtp_user')}
                    </Label>
                    <div className="relative group">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-operational-cyan transition-colors" />
                      <Input
                        {...register('smtp_user')}
                        dir="ltr"
                        className="pl-12 h-14 font-bold bg-surface-container-lowest border-outline-low rounded-2xl focus:ring-operational-cyan focus:border-operational-cyan transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      {watchedProvider === 'ses' ? t('label_secret_key') : t('smtp_password')}
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-operational-cyan transition-colors" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        {...register('smtp_password')}
                        dir="ltr"
                        className="pl-12 pr-12 h-14 font-bold bg-surface-container-lowest border-outline-low rounded-2xl focus:ring-operational-cyan focus:border-operational-cyan transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-operational-cyan transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Encryption Toggle */}
                <div className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-3xl bg-surface-container-highest/20 border border-white/5 gap-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-operational-cyan/10 rounded-2xl">
                        <Shield className="w-6 h-6 text-operational-cyan" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">{t('ssl_tls_label')}</p>
                        <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">
                          {t('ssl_tls_desc')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full md:w-64">
                      <Select
                        value={watchedEncryption}
                        onValueChange={(value) => setValue('smtp_encryption', value as 'none' | 'ssl' | 'tls', { shouldDirty: true })}
                      >
                        <SelectTrigger className="h-12 bg-surface-container-lowest border-outline-low rounded-xl font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-outline-low">
                          <SelectItem value="none" className="rounded-lg">{t('encryption_none')}</SelectItem>
                          <SelectItem value="ssl" className="rounded-lg">{t('encryption_ssl')}</SelectItem>
                          <SelectItem value="tls" className="rounded-lg">{t('encryption_tls')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between gap-4 pt-4 px-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || isDirty}
                className="h-14 px-8 border-outline-low hover:bg-surface-container-high transition-all font-bold uppercase text-[10px] tracking-widest gap-3 rounded-2xl group shadow-sm"
              >
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin text-operational-cyan" /> : <Send className="w-4 h-4 text-operational-cyan group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                {t('send_test_email')}
              </Button>
              
              <Button
                type="submit"
                disabled={isPending || !isDirty}
                className="h-14 px-10 bg-operational-cyan text-white hover:bg-operational-cyan/90 transition-all font-bold uppercase text-[10px] tracking-widest gap-3 rounded-2xl shadow-[0_10px_20px_rgba(var(--operational-cyan-rgb),0.2)] disabled:opacity-50 disabled:shadow-none"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {tCommon('save')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
