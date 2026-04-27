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
      <div className="flex w-full items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#00e5ff]" />
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-screen">
      {/* Left Panel */}
      <div className="hidden lg:flex w-[45%] relative flex-col justify-between p-12 overflow-hidden bg-[#0A0C0E] border-r border-[#1a1d21]">
        {/* Faint Background image overlay (Placeholder gradient instead of photo) */}
        <div 
          className="absolute inset-0 opacity-[0.2]" 
          style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 0%, transparent 70%)' }} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0C0E] via-transparent to-[#0A0C0E]" />
        
        {/* Top Left */}
        <div className="relative z-10">
          <LocaleSwitcher />
        </div>

        {/* Bottom Left Content */}
        <div className="relative z-10 mt-auto">
          <div className="text-[#00e5ff] mb-6">
            <UtensilsCrossed className="w-10 h-10" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            {t('login.hero_title')}
          </h1>
          <p className="text-[13px] text-gray-400 max-w-sm leading-relaxed mb-8">
            {t('login.hero_subtitle')}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-gray-400 border border-gray-800/80 bg-[#111315]/80 backdrop-blur-md w-fit px-3 py-1.5 rounded-md">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00e5ff]" />
            <span>{t('login.v3_enabled')}</span>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#111315]">
        <div className="w-full max-w-[380px]">
          <div className="mb-10">
            <h2 className="text-[22px] font-semibold text-white mb-2 tracking-wide">
              {t('login.title')}
            </h2>
            <p className="text-[13px] text-gray-400 tracking-wide">
              {t('login.description')}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Operator ID */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-gray-400 tracking-wide">
                {t('login.operator_id')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <BadgeCheck className="w-4 h-4 text-gray-500" />
                </div>
                <input
                  type="email"
                  placeholder={t('login.operator_id_placeholder')}
                  className="w-full bg-[#16191c] border border-transparent focus:border-[#00e5ff]/30 text-gray-200 text-sm pl-10 pr-4 py-3 rounded-md outline-none transition-all placeholder:text-gray-600 focus:bg-[#1a1d21]"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-[10px] text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            {/* Access Protocol */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-gray-400 tracking-wide">
                  {t('login.access_protocol')}
                </label>
                <button type="button" onClick={() => router.push('forgot-password')} className="text-[10px] text-[#00e5ff] hover:text-[#00e5ff]/80 font-medium">
                  {t('login.recover_access')}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Key className="w-4 h-4 text-gray-500" />
                </div>
                <input
                  type="password"
                  placeholder={t('login.password_placeholder')}
                  className="w-full bg-[#16191c] border border-transparent focus:border-[#00e5ff]/30 text-gray-200 text-sm pl-10 pr-10 py-3 rounded-md outline-none transition-all placeholder:text-gray-600 focus:bg-[#1a1d21]"
                  {...register('password')}
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center cursor-pointer">
                  <EyeOff className="w-4 h-4 text-gray-500 hover:text-gray-400 transition-colors" />
                </div>
              </div>
              {errors.password && <p className="text-[10px] text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 text-xs text-red-400 border border-red-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#00B4D8] hover:bg-[#00c9e0] text-black font-semibold text-[13px] tracking-wide py-3 rounded-md mt-4 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
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
          <div className="mt-8 border border-gray-800/40 rounded-md p-3 bg-[#16191c]/50">
            <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-2 font-semibold">{t('login.demo_access')}</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { role: t('roles.admin'), email: 'admin@kitchen.io' },
                { role: t('roles.manager'), email: 'store@kitchen.io' },
                { role: t('roles.chief'), email: 'kitchen@kitchen.io' },
                { role: t('roles.procurement'), email: 'procurement@kitchen.io' }
              ].map((cred, i) => (
                <div 
                  key={i} 
                  className="p-1.5 rounded hover:bg-[#1a1d21] transition-all cursor-pointer group" 
                  onClick={() => {
                    setValue('email', cred.email, { shouldValidate: true });
                    setValue('password', 'password123', { shouldValidate: true });
                  }}
                >
                  <div className="text-[9px] font-bold text-gray-400 group-hover:text-[#00B4D8] transition-colors">{cred.role}</div>
                  <div className="text-[10px] font-mono text-gray-600 truncate">{cred.email}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-800/50 flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00B4D8]" />
              <span className="text-[10px] text-gray-400 font-medium tracking-wider">{t('login.system_online')}</span>
            </div>
            <span className="text-[10px] text-gray-500 font-mono">v3.1.04</span>
          </div>
        </div>
      </div>
    </div>
  );
}
