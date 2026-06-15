'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Loader2,
    AlertCircle,
    ShieldCheck,
    BadgeCheck,
    Key,
    EyeOff,
    Eye,
    LogIn,
    Fingerprint,
    Usb,
    Activity
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import LocaleSwitcher from '@/components/shared/LocaleSwitcher';
import { Button } from '@/components/ui/button';
import { onFormError } from '@/hooks/useFormError';

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
    const [showPassword, setShowPassword] = useState(false);
    const redirected = useRef(false);
    const expiredNotice = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('reason') === 'expired'
      ? t('session_expired') : null;

    // Redirect authenticated users to dashboard — but NOT when we're here due to
    // an expired/invalid session. In that case the proxy has already cleared the
    // cookie via a self-redirect, but the AuthProvider's verifyTokenAndLoad() may
    // still resolve with the stale token that was in memory before the Set-Cookie
    // was applied by the browser. We must let the expiry notice render and wait
    // for the cookie to be gone before any redirect.
    const isAuthReason = typeof window !== 'undefined' &&
        ['expired', 'verification_failed'].includes(
            new URLSearchParams(window.location.search).get('reason') ?? ''
        );

    useEffect(() => {
        if (!authLoading && user && !redirected.current && !isAuthReason) {
            redirected.current = true;
            router.replace('/dashboard');
        }
    }, [user, authLoading, router, isAuthReason]);

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (values: LoginValues) => {
        setError(null);
        setIsSubmitting(true);
        try {
            await login(values.email, values.password);
        } catch (_err: unknown) {
            setError(t('invalid_credentials'));
            setIsSubmitting(false);
        }
    };

    // Show overlay spinner only when redirecting (user is authenticated) — but
    // skip it when the session has expired; we need the form to be visible.
    if (!authLoading && user && !isAuthReason) {
        return (
            <div className="flex w-full items-center justify-center min-h-screen bg-[#050505]">
                <div className="relative">
                    <Loader2 className="w-12 h-12 animate-spin text-operational-cyan" />
                    <div className="absolute inset-0 blur-xl bg-operational-cyan/20 animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row w-full min-h-screen bg-[#f7f9ff] dark:bg-[#050505] selection:bg-operational-cyan/30 text-[#181c20] dark:text-white overflow-x-hidden">
            {/* Left Panel: Brand Experience (Right in RTL) */}
            <div className="hidden lg:flex lg:basis-1/2 relative flex-col justify-between p-8 xl:p-12 overflow-hidden border-e border-black/5 dark:border-white/5 bg-white dark:bg-[#050505] shrink-0">
                {/* Background Image with sophisticated overlays */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/kitchen-bg.png"
                        alt={t('login.professional_kitchen_alt')}
                        fill
                        priority
                        sizes="(max-width: 1024px) 100vw, 50vw"
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

                {/* Top Navigation Overlay */}
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 px-4 py-2 rounded-2xl">
                        <Activity className="w-4 h-4 text-operational-cyan animate-pulse" />
                        <span className="text-[10px] font-bold text-black/70 dark:text-white/70 uppercase tracking-widest">{t('login.system_online')}</span>
                    </div>
                    <LocaleSwitcher />
                </div>

                {/* Content Overlay */}
                <div className="relative z-10 mt-auto w-full flex flex-col items-start">
                    <div className="inline-flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 bg-operational-cyan/10 border border-operational-cyan/30 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.15)] group overflow-hidden">
                            <Image 
                                src="/logoicon.png" 
                                alt={t('logo_alt')} 
                                width={36} 
                                height={36} 
                                className="transition-transform duration-500 group-hover:scale-110 object-contain"
                            />
                        </div>
                        <div className="h-10 w-px bg-black/10 dark:bg-white/10" />
                        <div className="px-3 py-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg backdrop-blur-sm">
                            <span className="text-[10px] font-mono text-black/50 dark:text-white/50 tracking-tighter uppercase">{t('login.version')}</span>
                        </div>
                    </div>

                    <h1 className="text-display-xs xl:text-display-sm font-black text-[#02617c] mb-2 leading-none tracking-tight whitespace-normal xl:whitespace-nowrap overflow-visible">
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
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-[#050505] bg-black/10 dark:bg-white/10 backdrop-blur-md flex items-center justify-center text-[11px] font-bold text-black/70 dark:text-white/70">
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

                {/* Decorative scanning line */}
                <div className="absolute top-0 right-0 w-[2px] h-full bg-gradient-to-b from-transparent via-operational-cyan/20 to-transparent animate-pulse" />
            </div>

            {/* Right Panel: Functional Core (Left in RTL) */}
            <div className="flex-1 min-w-[300px] flex flex-col items-stretch justify-center p-4 sm:p-6 lg:p-8 relative lg:overflow-y-auto bg-[#f7f9ff] dark:bg-[#050505] overflow-x-hidden">
                {/* Background decorative elements */}
                <div className="absolute top-1/4 end-1/4 w-[300px] h-[300px] bg-operational-cyan/5 blur-[100px] rounded-full pointer-events-none" />
                <div className="w-full max-w-4xl mx-auto relative z-10">
                    {/* Mobile-only Branding Header */}
                    <div className="lg:hidden flex flex-col items-center mb-4 animate-in fade-in slide-in-from-top-8 duration-1000">
                        <div className="w-12 h-12 bg-operational-cyan/10 border border-operational-cyan/30 rounded-xl flex items-center justify-center mb-4 overflow-hidden">
                            <Image 
                                src="/logoicon.png" 
                                alt={t('logo_alt')} 
                                width={28} 
                                height={28} 
                                className="object-contain"
                            />
                        </div>
                        <h2 className="text-display-xs font-black text-[#02617c] tracking-tighter text-center">
                            {t('login.hero_title')}
                        </h2>
                        <div className="mt-1 px-1.5 py-0.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded text-[8px] font-mono text-black/40 dark:text-white/40 uppercase">
                            {t('login.version')}
                        </div>
                    </div>

                    <div className="mb-3 text-center lg:text-start">
                        <h2 data-slot="card-title" className="text-title-sm font-bold text-black dark:text-white mb-1 tracking-tight">
                            {t('login.title')}
                        </h2>
                        <p className="text-[10px] text-black/60 dark:text-white/60">
                            {t('login.description')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-3">
                        {/* Operator ID Input */}
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/80 dark:text-white/80 ms-1 flex items-center gap-2">
                                {t('login.operator_id')}
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none z-10">
                                    <BadgeCheck className="w-3 h-3 text-black/30 dark:text-white/40 group-focus-within:text-operational-cyan transition-colors duration-300" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder={t('login.operator_id_placeholder')}
                                    className="w-full bg-black/[0.02] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 focus:border-operational-cyan focus:ring-2 focus:ring-operational-cyan/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-all h-9 rounded text-[11px] ps-9 pe-3 outline-none placeholder:text-black/30 dark:placeholder:text-white/40 text-black dark:text-white"
                                    {...register('email')}
                                />
                            </div>
                            {errors.email && <p className="text-[10px] text-status-error font-medium ms-1 mt-0.5">{errors.email.message}</p>}
                        </div>

                        {/* Access Protocol Input */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between ms-1">
                                <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/80 dark:text-white/80">
                                    {t('login.access_protocol')}
                                </label>
                                <button type="button" onClick={() => router.push('/forgot-password')} className="text-[8px] text-operational-cyan hover:text-black dark:hover:text-white font-bold transition-colors uppercase tracking-widest">
                                    {t('login.recover_access')}
                                </button>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none z-10">
                                    <Key className="w-3 h-3 text-black/30 dark:text-white/40 group-focus-within:text-operational-cyan transition-colors duration-300" />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder={t('login.password_placeholder')}
                                    className="w-full bg-black/[0.02] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 focus:border-operational-cyan focus:ring-2 focus:ring-operational-cyan/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-all h-9 rounded text-[11px] ps-9 pe-9 outline-none placeholder:text-black/30 dark:placeholder:text-white/40 text-black dark:text-white"
                                    {...register('password')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 end-0 pe-2.5 flex items-center text-black/30 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors z-20"
                                >
                                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-[10px] text-status-error font-medium ms-1 mt-0.5">{errors.password.message}</p>}
                        </div>

                        {/* Advanced Security Methods */}
                        <div className="grid grid-cols-2 gap-3 py-1">
                            <button
                                type="button"
                                className="flex flex-col items-center justify-center gap-1 p-2 rounded border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/5 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:border-operational-cyan/30 transition-all group opacity-80 hover:opacity-100"
                            >
                                <Fingerprint className="w-4 h-4 text-black/30 dark:text-white/40 group-hover:text-operational-cyan transition-colors" />
                                <span className="text-[7px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 group-hover:text-black/70 dark:group-hover:text-white/70">{t('login.biometric_link')}</span>
                            </button>
                            <button
                                type="button"
                                className="flex flex-col items-center justify-center gap-1 p-2 rounded border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/5 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:border-operational-cyan/30 transition-all group opacity-80 hover:opacity-100"
                            >
                                <Usb className="w-4 h-4 text-black/30 dark:text-white/40 group-hover:text-operational-cyan transition-colors" />
                                <span className="text-[7px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 group-hover:text-black/70 dark:group-hover:text-white/70">{t('login.hardware_token')}</span>
                            </button>
                        </div>

                        {expiredNotice && (
                            <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-status-warning/10 text-[11px] font-medium text-status-warning border border-status-warning/20 animate-in zoom-in-95 duration-300">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {expiredNotice}
                            </div>
                        )}
                        {error && (
                            <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-status-error/10 text-[11px] font-medium text-status-error border border-status-error/20 animate-in zoom-in-95 duration-300">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            isLoading={isSubmitting}
                            className="w-full h-9 text-[10px] font-bold bg-black dark:bg-white text-white dark:text-[#050505] hover:bg-operational-cyan dark:hover:bg-operational-cyan hover:text-white transition-all duration-300 rounded relative overflow-hidden group/btn shadow-[0_4px_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_30px_rgba(255,255,255,0.1)] mt-0.5"
                        >
                            <span className="relative flex items-center justify-center gap-1.5 uppercase tracking-[0.15em] text-[10px]">
                                <LogIn className="w-3 h-3" />
                                {t('login.initialize_session')}
                            </span>
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
