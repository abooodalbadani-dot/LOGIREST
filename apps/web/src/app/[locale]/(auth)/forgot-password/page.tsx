'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Mail,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldCheck,
  Activity,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { AuthSuccessResponseSchema } from '@/types/auth';
import LocaleSwitcher from '@/components/shared/LocaleSwitcher';
import { Button } from '@/components/ui/button';
import { onFormError } from '@/hooks/useFormError';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const router = useRouter();

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordValues) => {
    try {
      setError(null);
      await apiClient.post('/auth/forgot-password', AuthSuccessResponseSchema, data);
      setIsSubmitted(true);
    } catch (_err) {
      setError(t('invalid_credentials'));
    }
  };

  const renderSuccess = () => (
    <div className="w-full max-w-[1600px] p-12 bg-card dark:bg-[#0a0a0a] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl text-center relative z-10 animate-in fade-in zoom-in duration-500 flex-shrink-0">
      <div className="w-16 h-16 bg-status-success/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-status-success/20">
        <CheckCircle2 className="w-8 h-8 text-status-success" />
      </div>
      <h2 className="text-title-sm font-bold text-black dark:text-white mb-3 tracking-tight">{t('email_sent')}</h2>
      <p className="text-[11px] text-black/60 dark:text-white/60 mb-8 leading-relaxed px-4">
        {t('email_sent_desc', { email: getValues('email') })}
      </p>
      <Button
        onClick={() => router.push('/login')}
        className="w-full h-10 flex items-center justify-center gap-2 text-[10px] font-bold bg-black dark:bg-card text-white dark:text-[#050505] hover:bg-operational-cyan transition-all rounded-lg uppercase tracking-widest shadow-sm shadow-black/5 dark:shadow-white/5 border-none"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t('back_to_login')}
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen bg-[#f7f9ff] dark:bg-[#050505] selection:bg-operational-cyan/30 text-[#181c20] dark:text-white overflow-x-hidden">
      {/* Left Panel: Brand Experience */}
      <div className="hidden lg:flex lg:basis-1/2 relative flex-col justify-between p-8 xl:p-12 overflow-hidden border-e border-black/5 dark:border-white/5 bg-card dark:bg-[#050505] shrink-0">
        <div className="absolute inset-0 z-0">
          <Image
            src="/kitchen-bg.png"
            alt={t('login.professional_kitchen_alt')}
            fill
            priority
            className="object-cover scale-105"
          />
          {/* Multi-layer overlays for depth and legibility */}
          <div className="absolute inset-0 bg-background/30 dark:bg-background/60 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-gradient-to-tr from-background dark:from-background via-background/20 dark:via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 dark:to-background/90" />

          {/* Dynamic accent glows */}
          <div className="absolute -top-40 -start-40 w-[600px] h-[600px] bg-accent/10 blur-[120px] rounded-full pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
          <div className="absolute bottom-1/4 -end-20 w-[400px] h-[400px] bg-primary/10 blur-[100px] rounded-full pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3 bg-black/5 dark:bg-card/5 backdrop-blur-xl border border-black/10 dark:border-white/10 px-4 py-2 rounded-2xl">
            <Activity className="w-4 h-4 text-operational-cyan animate-pulse" />
            <span className="text-[10px] font-bold text-black/70 dark:text-white/70 uppercase tracking-widest">{t('login.system_online')}</span>
          </div>
          <LocaleSwitcher />
        </div>

        <div className="relative z-10 mt-auto w-full flex flex-col items-start">
          <div className="inline-flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-operational-cyan/10 border border-operational-cyan/30 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.15)] group overflow-hidden">
              <Image
                src="/logoicon.svg"
                alt={t('logo_alt')}
                width={36}
                height={36}
                className="transition-transform duration-500 group-hover:scale-110 object-contain"
              />
            </div>
            <div className="h-10 w-px bg-black/10 dark:bg-card/10" />
            <div className="px-3 py-1 bg-black/5 dark:bg-card/5 border border-black/10 dark:border-white/10 rounded-lg backdrop-blur-sm">
              <span className="text-[10px] font-mono text-black/50 dark:text-white/50 tracking-tighter uppercase">{t('login.version')}</span>
            </div>
          </div>

          <h1 className="text-display-xs xl:text-display-sm font-black text-foreground mb-2 leading-none tracking-tight whitespace-normal xl:whitespace-nowrap overflow-visible">
            {t('login.hero_title')}
          </h1>
          <p className="text-body-sm text-black/60 dark:text-white/60 mb-6 leading-relaxed font-light whitespace-normal xl:whitespace-nowrap">
            {t('login.hero_subtitle')}
          </p>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-3 text-label-sm text-operational-cyan/80 border border-operational-cyan/20 bg-operational-cyan/5 backdrop-blur-md px-4 py-2.5 rounded-xl transition-all hover:bg-operational-cyan/10">
              <ShieldCheck className="w-5 h-5" />
              <span className="font-semibold tracking-wide uppercase">{t('login.v3_enabled')}</span>
            </div>

            <div className="flex -space-x-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-[#050505] bg-black/10 dark:bg-card/10 backdrop-blur-md flex items-center justify-center text-[11px] font-bold text-black/70 dark:text-white/70">
                  OP
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-white dark:border-[#050505] bg-operational-cyan/20 backdrop-blur-md flex items-center justify-center text-[10px] font-bold text-operational-cyan">
                +12
              </div>
            </div>
            <span className="text-[10px] text-black/60 dark:text-white/60 font-bold tracking-widest">{t('login.active_operators')}</span>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-[2px] h-full bg-gradient-to-b from-transparent via-operational-cyan/20 to-transparent animate-pulse" />
      </div>

      {/* Right Panel: Functional Core */}
      <div className="flex-1 min-w-[300px] flex flex-col items-stretch justify-center p-4 sm:p-6 lg:p-8 relative lg:overflow-y-auto bg-[#f7f9ff] dark:bg-[#050505] overflow-x-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-1/4 end-1/4 w-[300px] h-[300px] bg-operational-cyan/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="w-full max-w-[1800px] mx-auto relative z-10 flex flex-col items-center">
          {/* Mobile Branding */}
          <div className="lg:hidden flex flex-col items-center mb-4 animate-in fade-in slide-in-from-top-8 duration-1000">
            <div className="w-12 h-12 bg-operational-cyan/10 border border-operational-cyan/30 rounded-xl flex items-center justify-center mb-4 overflow-hidden">
              <Image src="/logoicon.png" alt={t('logo_alt')} width={28} height={28} className="object-contain" />
            </div>
            <h1 className="text-xl font-bold text-foreground text-center">{t('login.hero_title')}</h1>
            <div className="mt-1 px-1.5 py-0.5 bg-black/5 dark:bg-card/5 border border-black/10 dark:border-white/10 rounded text-[8px] font-mono text-black/40 dark:text-white/40 uppercase">
              {t('login.version')}
            </div>
          </div>

          {isSubmitted ? renderSuccess() : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="mb-6 text-center lg:text-start">
                <h2 className="text-title-sm font-bold text-black dark:text-white mb-1 tracking-tight">
                  {t('forgot_password')}
                </h2>
                <p className="text-[10px] text-black/60 dark:text-white/60">
                  {t('forgot_password_desc')}
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/80 dark:text-white/80 ms-1 flex items-center gap-2">
                    <Mail className="w-3 h-3" />
                    {t('email')}
                  </label>
                  <div className="relative group">
                    <input
                      type="email"
                      placeholder={t('login.operator_placeholder')}
                      className="w-full bg-black/[0.02] dark:bg-card/[0.03] border border-black/10 dark:border-white/10 focus:border-operational-cyan focus:ring-2 focus:ring-operational-cyan/10 hover:bg-black/[0.04] dark:hover:bg-card/[0.05] transition-all h-9 rounded text-[11px] px-4 outline-none placeholder:text-black/30 dark:placeholder:text-white/40 text-black dark:text-white"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="text-[10px] text-status-error font-medium ms-1 mt-0.5">{errors.email.message}</p>}
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-status-error/10 text-[11px] font-medium text-status-error border border-status-error/20">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="w-full h-9 text-[10px] font-bold bg-black dark:bg-card text-white dark:text-[#050505] hover:bg-operational-cyan transition-all duration-300 rounded uppercase tracking-[0.15em]"
                >
                  {t('send_reset_link')}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => router.push('/login')}
                    className="text-[8px] text-black/40 dark:text-white/40 hover:text-operational-cyan font-bold transition-colors uppercase tracking-[0.2em] inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    {t('back_to_login')}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
