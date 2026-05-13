'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
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

    console.log(`[LoginPage] hero_title: ${t('login.hero_title')}`);

    const { login, user, isLoading: authLoading } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const redirected = useRef(false);

    // Redirect authenticated users to dashboard
    useEffect(() => {
        if (!authLoading && user && !redirected.current) {
            redirected.current = true;
            router.replace('/dashboard');
        }
    }, [user, authLoading, router]);

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

    // Show overlay spinner only when redirecting (user is authenticated)
    if (!authLoading && user) {
        return (
            <div className="flex w-full items-center justify-center min-h-screen bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-operational-cyan" />
            </div>
        );
    }

    return (
        <div className="flex w-full min-h-screen lg:h-screen lg:overflow-hidden bg-background">
            {/* Left Panel */}
            <div className="hidden lg:flex w-[45%] relative flex-col justify-between p-12 overflow-hidden bg-background border-r border-white/5 shrink-0">
                {/* Faint Background image overlay with glassmorphism touches */}
                <div className="absolute -top-40 -start-40 w-96 h-96 bg-operational-cyan/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none" />
                <div className="absolute -bottom-40 -end-40 w-96 h-96 bg-primary/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50 z-0" />

                {/* Top Left */}
                <div className="relative z-10">
                    <LocaleSwitcher />
                </div>

                {/* Bottom Left Content */}
                <div className="relative z-10 mt-auto">
                    <div className="text-operational-cyan mb-6">
                        <UtensilsCrossed className="w-10 h-10" strokeWidth={2.5} />
                    </div>
                    <h1 className="text-headline-lg font-bold text-foreground mb-4">
                        {t('login.hero_title')}
                    </h1>
                    <p className="text-body-md text-muted-foreground/60 max-w-sm leading-relaxed mb-8">
                        {t('login.hero_subtitle')}
                    </p>
                    <div className="flex items-center gap-2 text-label-xs text-muted-foreground/60 border border-border-muted/50 bg-surface-container-low/80 backdrop-blur-md w-fit px-3 py-1.5 rounded-md">
                        <ShieldCheck className="w-3.5 h-3.5 text-operational-cyan" />
                        <span>{t('login.v3_enabled')}</span>
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-background relative lg:overflow-y-auto py-12 sm:py-16">
                {/* Animated Glow effects for Right Panel */}
                <div className="absolute -top-32 -end-32 w-80 h-80 bg-operational-cyan/15 blur-[80px] rounded-full mix-blend-screen animate-pulse pointer-events-none" />
                <div className="absolute -bottom-32 -start-32 w-80 h-80 bg-primary/10 blur-[80px] rounded-full mix-blend-screen opacity-50 pointer-events-none" />

                <div className="w-full max-w-[420px] p-8 sm:p-10 bg-surface-container-low/60 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-2xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="mb-10 text-center">
                        <h2 className="text-headline-sm font-bold text-foreground mb-3 tracking-tight">
                            {t('login.title')}
                        </h2>
                        <p className="text-body-md text-muted-foreground/70 px-2">
                            {t('login.description')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Operator ID */}
                        <div className="space-y-2.5 group/field">
                            <label className="text-label-sm font-semibold uppercase tracking-wider text-muted-foreground ms-1 flex items-center gap-2">
                                {t('login.operator_id')}
                            </label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none z-10">
                                    <BadgeCheck className="w-5 h-5 text-muted-foreground/50 group-focus-within/input:text-operational-cyan transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    placeholder={t('login.operator_id_placeholder')}
                                    className="w-full bg-surface-container-lowest/50 border border-white/10 focus:border-operational-cyan focus:ring-1 focus:ring-operational-cyan/50 hover:bg-surface-container-lowest/80 transition-all h-14 rounded-xl text-body-lg ps-12 pe-4 outline-none placeholder:text-muted-foreground/40"
                                    {...register('email')}
                                />
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-operational-cyan/20 to-transparent opacity-0 group-focus-within/input:opacity-10 pointer-events-none transition-opacity duration-500" />
                            </div>
                            {errors.email && <p className="text-label-sm text-status-error font-medium ms-1 mt-1">{errors.email.message}</p>}
                        </div>

                        {/* Access Protocol */}
                        <div className="space-y-2.5 group/field">
                            <div className="flex items-center justify-between ms-1">
                                <label className="text-label-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    {t('login.access_protocol')}
                                </label>
                                <button type="button" onClick={() => router.push('/forgot-password')} className="text-label-sm text-operational-cyan hover:text-operational-cyan/80 font-semibold transition-colors">
                                    {t('login.recover_access')}
                                </button>
                            </div>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none z-10">
                                    <Key className="w-5 h-5 text-muted-foreground/50 group-focus-within/input:text-operational-cyan transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    placeholder={t('login.password_placeholder')}
                                    className="w-full bg-surface-container-lowest/50 border border-white/10 focus:border-operational-cyan focus:ring-1 focus:ring-operational-cyan/50 hover:bg-surface-container-lowest/80 transition-all h-14 rounded-xl text-body-lg ps-12 pe-12 outline-none placeholder:text-muted-foreground/40"
                                    {...register('password')}
                                />
                                <div className="absolute inset-y-0 end-0 pe-4 flex items-center cursor-pointer z-10">
                                    <EyeOff className="w-5 h-5 text-muted-foreground/40 hover:text-foreground transition-colors" />
                                </div>
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-operational-cyan/20 to-transparent opacity-0 group-focus-within/input:opacity-10 pointer-events-none transition-opacity duration-500" />
                            </div>
                            {errors.password && <p className="text-label-sm text-status-error font-medium ms-1 mt-1">{errors.password.message}</p>}
                        </div>

                        {error && (
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-status-error/10 text-label-sm font-medium text-status-error border border-status-error/20 animate-in fade-in slide-in-from-top-2 duration-300">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-14 text-title-sm font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[0.98] active:scale-95 disabled:opacity-70 rounded-xl relative overflow-hidden group/btn mt-4 flex items-center justify-center gap-2"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out" />
                            <span className="relative flex items-center justify-center gap-2">
                                {isSubmitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <LogIn className="w-5 h-5" />
                                        {t('login.authenticate')}
                                    </>
                                )}
                            </span>
                        </button>
                    </form>

                    {/* Demo Credentials Helper - Subtle Design */}
                    <div className="mt-8 border border-white/5 rounded-2xl p-4 bg-surface-container-lowest/30 backdrop-blur-sm">
                        <div className="text-label-xs text-muted-foreground/60 uppercase mb-3 font-semibold tracking-wider flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-operational-cyan/50" />
                            {t('login.demo_access')}
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                            {[
                                { role: t('roles.admin'), email: 'admin@kitchen.io' },
                                { role: t('roles.manager'), email: 'store@kitchen.io' },
                                { role: t('roles.chief'), email: 'kitchen@kitchen.io' },
                                { role: t('roles.procurement'), email: 'procurement@kitchen.io' }
                            ].map((cred, i) => (
                                <div
                                    key={i}
                                    className="p-2 rounded-xl hover:bg-surface-container-low/80 border border-transparent hover:border-white/5 transition-all cursor-pointer group"
                                    onClick={() => {
                                        setValue('email', cred.email, { shouldValidate: true });
                                        setValue('password', 'password123', { shouldValidate: true });
                                    }}
                                >
                                    <div className="text-label-xs font-bold text-muted-foreground/70 group-hover:text-operational-cyan transition-colors">{cred.role}</div>
                                    <div className="text-[11px] font-mono text-muted-foreground/40 truncate mt-0.5">{cred.email}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-operational-cyan animate-pulse" />
                            <span className="text-label-xs text-muted-foreground/60 font-semibold tracking-wide uppercase">{t('login.system_online')}</span>
                        </div>
                        <span className="text-label-xs text-muted-foreground/40 font-mono bg-white/5 px-2 py-1 rounded-md">{t('login.version')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
