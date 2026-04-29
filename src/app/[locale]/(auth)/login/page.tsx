'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle, UtensilsCrossed, ShieldCheck, BadgeCheck, Key, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import LocaleSwitcher from '@/components/shared/LocaleSwitcher';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { login, user, isLoading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsMounted(true), 0);
  }, []);

  useEffect(() => {
    if (isMounted && !authLoading && user) {
      router.replace(`dashboard`);
    }
  }, [user, authLoading, router, isMounted]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginValues) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(values.email, values.password);
    } catch (err: unknown) {
      setError(t('invalid_credentials'));
      setIsSubmitting(false);
    }
  };

  if (!isMounted || authLoading || user) {
    return (
      <div className="flex w-full items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-operational-cyan" />
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-screen">
      {/* Left Panel */}
      <div className="hidden lg:flex w-[45%] relative flex-col justify-between p-12 overflow-hidden bg-surface-container-lowest border-r border-border-muted/50">
        {/* Faint Background image overlay (Placeholder gradient instead of photo) */}
        <div 
          className="absolute inset-0 opacity-[0.1]" 
          style={{ backgroundImage: 'radial-gradient(circle at center, var(--on-surface) 0%, transparent 70%)' }} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-surface-container-lowest" />
        
        {/* Top Left */}
        <div className="relative z-10">
          <LocaleSwitcher />
        </div>

        {/* Bottom Left Content */}
        <div className="relative z-10 mt-auto">
          <div className="text-operational-cyan mb-6">
            <UtensilsCrossed className="w-10 h-10" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4 tracking-tight">
            {t('login.hero_title')}
          </h1>
          <p className="text-[13px] text-muted-foreground/60 max-w-sm leading-relaxed mb-8">
            {t('login.hero_subtitle')}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60 border border-border-muted/50 bg-surface-container-low/80 backdrop-blur-md w-fit px-3 py-1.5 rounded-md">
            <ShieldCheck className="w-3.5 h-3.5 text-operational-cyan" />
            <span>{t('login.v3_enabled')}</span>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-container-low">
        <div className="w-full max-w-[380px]">
          <div className="mb-10">
            <h2 className="text-[22px] font-semibold text-foreground mb-2 tracking-wide">
              {t('login.title')}
            </h2>
            <p className="text-[13px] text-muted-foreground/60 tracking-wide">
              {t('login.description')}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Operator ID */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground/60 tracking-wide">
                {t('login.operator_id')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none">
                  <BadgeCheck className="w-4 h-4 text-muted-foreground/60/50" />
                </div>
                <input
                  type="email"
                  placeholder={t('login.operator_id_placeholder')}
                  className="w-full bg-surface-container-lowest border border-border-muted/30 focus:border-operational-cyan/30 text-foreground text-sm ps-10 pe-4 py-3 rounded-md outline-none transition-all placeholder:text-muted-foreground/60/30 focus:bg-surface-container-low"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-[10px] text-status-error mt-1">{errors.email.message}</p>}
            </div>

            {/* Access Protocol */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-muted-foreground/60 tracking-wide">
                  {t('login.access_protocol')}
                </label>
                <button type="button" onClick={() => router.push('forgot-password')} className="text-[10px] text-operational-cyan hover:text-operational-cyan/80 font-medium">
                  {t('login.recover_access')}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none">
                  <Key className="w-4 h-4 text-muted-foreground/60/50" />
                </div>
                <input
                  type="password"
                  placeholder={t('login.password_placeholder')}
                  className="w-full bg-surface-container-lowest border border-border-muted/30 focus:border-operational-cyan/30 text-foreground text-sm ps-10 pe-10 py-3 rounded-md outline-none transition-all placeholder:text-muted-foreground/60/30 focus:bg-surface-container-low"
                  {...register('password')}
                />
                <div className="absolute inset-y-0 end-0 pe-3.5 flex items-center cursor-pointer">
                  <EyeOff className="w-4 h-4 text-muted-foreground/60/50 hover:text-muted-foreground/60 transition-colors" />
                </div>
              </div>
              {errors.password && <p className="text-[10px] text-status-error mt-1">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-status-error/10 text-xs text-status-error border border-status-error/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-[13px] tracking-wide py-3 rounded-xl mt-4 flex items-center justify-center gap-2 transition-all hover:scale-[0.98] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  {t('login.authenticate')}
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials Helper - Subtle Design */}
          <div className="mt-8 border border-border-muted/20 rounded-md p-3 bg-surface-container-lowest/50">
            <div className="text-[9px] text-muted-foreground/60 uppercase tracking-widest mb-2 font-semibold">{t('login.demo_access')}</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { role: t('roles.admin'), email: 'admin@kitchen.io' },
                { role: t('roles.manager'), email: 'store@kitchen.io' },
                { role: t('roles.chief'), email: 'kitchen@kitchen.io' },
                { role: t('roles.procurement'), email: 'procurement@kitchen.io' }
              ].map((cred, i) => (
                <div 
                  key={i} 
                  className="p-1.5 rounded hover:bg-surface-container-low transition-all cursor-pointer group" 
                  onClick={() => {
                    setValue('email', cred.email, { shouldValidate: true });
                    setValue('password', 'password123', { shouldValidate: true });
                  }}
                >
                  <div className="text-[9px] font-bold text-muted-foreground/60 group-hover:text-operational-cyan transition-colors">{cred.role}</div>
                  <div className="text-[10px] font-mono text-muted-foreground/60/50 truncate">{cred.email}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-border-muted/30 flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-operational-cyan" />
              <span className="text-[10px] text-muted-foreground/60 font-medium tracking-wider">{t('login.system_online')}</span>
            </div>
            <span className="text-[10px] text-muted-foreground/60/50 font-mono">v3.1.04</span>
          </div>
        </div>
      </div>
    </div>
  );
}
