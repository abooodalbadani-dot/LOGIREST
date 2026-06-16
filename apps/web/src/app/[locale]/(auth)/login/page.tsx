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
import { Input } from '@/components/ui/input';
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

            // Explicitly redirect after successful login to bypass the isAuthReason useEffect lock
            const searchParams = new URLSearchParams(window.location.search);
            const redirectUrl = searchParams.get('redirect') || '/dashboard';
            router.replace(redirectUrl);

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
            <div className="hidden lg:flex lg:basis-1/2 relative w-full h-screen bg-cover bg-center overflow-hidden flex-col justify-between shrink-0">
                {/* Background Image with sophisticated overlays */}
                <Image
                    src="/kitchen-bg.png"
                    alt={t('login.professional_kitchen_alt')}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover scale-105 z-0"
                />
                <div className="absolute inset-0 bg-black/60 md:bg-gradient-to-t md:from-[#111827] md:via-[#111827]/80 md:to-transparent z-10"></div>

                {/* Top Navigation Overlay */}
                <div className="w-full flex justify-between absolute top-0 p-6 z-20 start-0">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs font-medium">
                        <Activity className="w-4 h-4 text-brand-gold animate-pulse" />
                        <span className="uppercase tracking-widest">{t('login.system_online')}</span>
                    </div>
                    <LocaleSwitcher />
                </div>

                {/* Content Overlay */}
                <div className="absolute bottom-0 w-full p-8 md:p-12 flex flex-col gap-6 z-20 start-0">
                    <div className="inline-flex items-center gap-4">
                        <div className="w-16 h-16 bg-brand-gold/10 border border-brand-gold/30 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(196,162,118,0.15)] group overflow-hidden">
                            <Image
                                src="/logoicon.svg"
                                alt={t('logo_alt')}
                                width={36}
                                height={36}
                                style={{ height: 'auto' }}
                                className="transition-transform duration-500 group-hover:scale-110 object-contain"
                            />
                        </div>
                        <div className="h-10 w-px bg-card/10" />
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs font-medium">
                            <span className="font-mono tracking-tighter uppercase">{t('login.version')}</span>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-wide mb-2">
                            Otantik Restaurant <span className="text-brand-gold">|</span> مطاعم أوتانتيك
                        </h1>
                        <p className="text-gray-300 text-sm md:text-base font-light tracking-wide">
                            {t('login.hero_subtitle')}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-gold/10 backdrop-blur-md border border-brand-gold/30 text-brand-gold text-sm">
                            <ShieldCheck className="w-5 h-5" />
                            <span className="font-semibold tracking-wide uppercase">{t('login.v3_enabled')}</span>
                        </div>

                        <div className="flex">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="-me-3 w-10 h-10 rounded-full border-2 border-[#111827] bg-black/40 backdrop-blur-md flex items-center justify-center text-[11px] font-bold text-white relative z-10">
                                    OP
                                </div>
                            ))}
                            <div className="w-10 h-10 rounded-full border-2 border-[#111827] bg-brand-gold/20 backdrop-blur-md flex items-center justify-center text-[10px] font-bold text-brand-gold">
                                +12
                            </div>
                        </div>
                        <span className="text-[10px] text-gray-300 font-bold tracking-widest">{t('login.active_operators')}</span>
                    </div>
                </div>
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
                                src="/logoicon.svg"
                                alt={t('logo_alt')}
                                width={28}
                                height={28}
                                style={{ height: 'auto' }}
                                className="object-contain"
                            />
                        </div>
                        <h1 className="text-xl font-bold text-foreground text-center">
                            {t('login.hero_title')}
                        </h1>
                        <div className="mt-1 px-1.5 py-0.5 bg-black/5 dark:bg-card/5 border border-black/10 dark:border-white/10 rounded text-[8px] font-mono text-black/40 dark:text-white/40 uppercase">
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
                            {/* TODO: WCAG-AA */}
                            <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/80 dark:text-white/80 ms-1 flex items-center gap-2">
                                {t('login.operator_id')}
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none z-10">
                                    <BadgeCheck className="w-3 h-3 text-black/30 dark:text-white/40 group-focus-within:text-operational-cyan transition-colors duration-300" />
                                </div>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder={t('login.operator_id_placeholder')}
                                    className="w-full bg-black/[0.02] dark:bg-card/[0.03] border border-black/10 dark:border-white/10 focus-visible:ring-operational-cyan focus-visible:border-operational-cyan hover:bg-black/[0.04] dark:hover:bg-card/[0.05] transition-all h-9 rounded text-[11px] ps-9 pe-3 placeholder:text-black/30 dark:placeholder:text-white/40 text-black dark:text-white"
                                    {...register('email')}
                                />
                            </div>
                            {errors.email && <p className="text-[10px] text-status-error font-medium ms-1 mt-0.5">{errors.email.message}</p>}
                        </div>

                        {/* Access Protocol Input */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between ms-1">
                                {/* TODO: WCAG-AA */}
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
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder={t('login.password_placeholder')}
                                    className="w-full bg-black/[0.02] dark:bg-card/[0.03] border border-black/10 dark:border-white/10 focus-visible:ring-operational-cyan focus-visible:border-operational-cyan hover:bg-black/[0.04] dark:hover:bg-card/[0.05] transition-all h-9 rounded text-[11px] ps-9 pe-9 placeholder:text-black/30 dark:placeholder:text-white/40 text-black dark:text-white"
                                    {...register('password')}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 end-0 h-full w-9 px-0 hover:bg-transparent flex items-center justify-center text-black/30 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors z-20"
                                >
                                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </Button>
                            </div>
                            {errors.password && <p className="text-[10px] text-status-error font-medium ms-1 mt-0.5">{errors.password.message}</p>}
                        </div>

                        {/* Advanced Security Methods */}
                        <div className="grid grid-cols-2 gap-3 py-1">
                            <button
                                type="button"
                                className="flex flex-col items-center justify-center gap-1 p-2 rounded border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-card/5 hover:bg-black/[0.05] dark:hover:bg-card/[0.08] hover:border-operational-cyan/30 transition-all group opacity-80 hover:opacity-100"
                            >
                                <Fingerprint className="w-4 h-4 text-black/30 dark:text-white/40 group-hover:text-operational-cyan transition-colors" />
                                <span className="text-[7px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 group-hover:text-black/70 dark:group-hover:text-white/70">{t('login.biometric_link')}</span>
                            </button>
                            <button
                                type="button"
                                className="flex flex-col items-center justify-center gap-1 p-2 rounded border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-card/5 hover:bg-black/[0.05] dark:hover:bg-card/[0.08] hover:border-operational-cyan/30 transition-all group opacity-80 hover:opacity-100"
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
                            className="w-full h-9 text-[10px] font-bold bg-black dark:bg-card text-white dark:text-[#050505] hover:bg-operational-cyan dark:hover:bg-operational-cyan hover:text-white transition-all duration-300 rounded relative overflow-hidden group/btn shadow-[0_4px_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_30px_rgba(255,255,255,0.1)] mt-0.5"
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
