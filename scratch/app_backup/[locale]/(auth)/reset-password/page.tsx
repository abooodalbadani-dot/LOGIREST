'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useParams, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Lock,
    Eye,
    EyeOff,
    CheckCircle2,
    Loader2,
    AlertCircle,
    UtensilsCrossed,
    ShieldCheck,
    ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form';
import { apiClient } from '@/lib/api/client';
import { ResetPasswordSchema, ResetPasswordInput, AuthSuccessResponseSchema } from '@/types/auth';
import LocaleSwitcher from '@/components/shared/LocaleSwitcher';

export default function ResetPasswordPage() {
    const t = useTranslations('auth');
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [showPassword, setShowPassword] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<ResetPasswordInput>({
        resolver: zodResolver(ResetPasswordSchema),
        defaultValues: {
            token: token || '',
            password: '',
            confirmPassword: '',
        },
    });

    const { isSubmitting } = form.formState;

    // Sync token if it comes late or changes
    useEffect(() => {
        if (token) {
            form.setValue('token', token);
        }
    }, [token, form]);

    const onSubmit = async (data: ResetPasswordInput) => {
        try {
            setError(null);
            await apiClient.post('/auth/reset-password', AuthSuccessResponseSchema, data);
            setIsSuccess(true);

            // Auto redirect after 3 seconds
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (_err) {
            setError(t('invalid_credentials')); // Fallback error
        }
    };

    const renderSuccess = () => (
        <div className="w-full max-w-[420px] p-8 sm:p-10 bg-surface-container-low/60 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-2xl text-center relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="absolute -top-32 -start-32 w-64 h-64 bg-status-success/20 blur-[64px] rounded-full mix-blend-screen animate-pulse pointer-events-none" />
            <div className="absolute -bottom-32 -end-32 w-64 h-64 bg-operational-cyan/10 blur-[64px] rounded-full mix-blend-screen opacity-50 pointer-events-none" />

            <div className="w-20 h-20 bg-gradient-to-br from-status-success/20 to-status-success/5 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-status-success/30 shadow-[0_0_40px_rgba(var(--status-success-rgb),0.2)] transform transition-transform duration-500 hover:scale-110">
                <CheckCircle2 className="w-10 h-10 text-status-success drop-shadow-md" />
            </div>
            <h2 className="text-headline-sm font-bold text-foreground mb-3 tracking-tight">{t('password_reset_success')}</h2>
            <p className="text-muted-foreground/70 mb-10 text-body-md leading-relaxed px-4">
                {t('password_reset_redirect')}
            </p>
            <Button
                variant="ghost"
                onClick={() => router.push('/login')}
                className="w-full h-12 gap-2 font-bold transition-all hover:scale-[0.98] active:scale-95 group/btn"
            >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover/btn:-translate-x-1 rtl:group-hover/btn:translate-x-1" />
                {t('back_to_login')}
            </Button>
        </div>
    );

    const renderInvalidToken = () => (
        <div className="w-full max-w-[420px] p-8 sm:p-10 bg-surface-container-low/60 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-2xl text-center relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="absolute -top-32 -start-32 w-64 h-64 bg-status-error/15 blur-[64px] rounded-full mix-blend-screen pointer-events-none" />
            <div className="absolute -bottom-32 -end-32 w-64 h-64 bg-status-error/10 blur-[64px] rounded-full mix-blend-screen opacity-50 pointer-events-none" />

            <div className="w-20 h-20 bg-gradient-to-br from-status-error/20 to-status-error/5 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-status-error/30 shadow-[0_0_40px_rgba(var(--status-error-rgb),0.2)] transform transition-all hover:scale-110">
                <AlertCircle className="w-10 h-10 text-status-error drop-shadow-md" />
            </div>
            <h2 className="text-headline-sm font-bold text-foreground mb-3 tracking-tight">{t('invalid_reset_link')}</h2>
            <p className="text-muted-foreground/70 mb-10 text-body-md leading-relaxed px-4">
                {t('invalid_reset_link_desc')}
            </p>
            <Button
                variant="ghost"
                onClick={() => router.push('/forgot-password')}
                className="w-full h-12 gap-2 font-bold transition-all hover:scale-[0.98] active:scale-95 group/btn"
            >
                {t('forgot_password')}
            </Button>
        </div>
    );

    return (
        <div className="flex w-full min-h-screen lg:h-screen lg:overflow-hidden bg-background">
            {/* Left Panel */}
            <div className="hidden lg:flex w-[45%] relative flex-col justify-between p-12 overflow-hidden bg-background border-r border-white/5 shrink-0">
                <div className="absolute -top-40 -start-40 w-96 h-96 bg-operational-cyan/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none" />
                <div className="absolute -bottom-40 -end-40 w-96 h-96 bg-primary/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50 z-0" />

                <div className="relative z-10">
                    <LocaleSwitcher />
                </div>

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
                <div className="absolute -top-32 -end-32 w-80 h-80 bg-operational-cyan/15 blur-[80px] rounded-full mix-blend-screen animate-pulse pointer-events-none" />
                <div className="absolute -bottom-32 -start-32 w-80 h-80 bg-primary/10 blur-[80px] rounded-full mix-blend-screen opacity-50 pointer-events-none" />

                {isSuccess ? renderSuccess() : (!token ? renderInvalidToken() : (
                    <div className="w-full max-w-[420px] p-8 sm:p-10 bg-surface-container-low/60 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-2xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="mb-10 text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-operational-cyan/20 to-operational-cyan/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-operational-cyan/30 shadow-[0_0_30px_rgba(var(--operational-cyan-rgb),0.15)] transform transition-all hover:rotate-3">
                                <Lock className="w-8 h-8 text-operational-cyan drop-shadow-sm" />
                            </div>
                            <h1 className="text-headline-sm font-bold text-foreground tracking-tight">{t('reset_password')}</h1>
                            <p className="text-muted-foreground/70 mt-3 text-body-md px-2">
                                {t('reset_password_desc')}
                            </p>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2.5">
                                            <FormLabel className="text-label-sm font-semibold uppercase tracking-wider text-muted-foreground ms-1 flex items-center gap-2">{t('new_password')}</FormLabel>
                                            <FormControl>
                                                <div className="relative group/input">
                                                    <Input
                                                        {...field}
                                                        type={showPassword ? 'text' : 'password'}
                                                        className="bg-surface-container-lowest/50 border-white/10 focus:border-operational-cyan focus:ring-1 focus:ring-operational-cyan/50 hover:bg-surface-container-lowest/80 transition-all h-14 rounded-xl text-body-lg px-4 pe-12"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute end-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors z-10"
                                                    >
                                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                    </button>
                                                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-operational-cyan/20 to-transparent opacity-0 group-focus-within/input:opacity-10 pointer-events-none transition-opacity duration-500" />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-label-sm text-status-error font-medium ms-1" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2.5">
                                            <FormLabel className="text-label-sm font-semibold uppercase tracking-wider text-muted-foreground ms-1 flex items-center gap-2">{t('confirm_new_password')}</FormLabel>
                                            <FormControl>
                                                <div className="relative group/input">
                                                    <Input
                                                        {...field}
                                                        type="password"
                                                        className="bg-surface-container-lowest/50 border-white/10 focus:border-operational-cyan focus:ring-1 focus:ring-operational-cyan/50 hover:bg-surface-container-lowest/80 transition-all h-14 rounded-xl text-body-lg px-4"
                                                    />
                                                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-operational-cyan/20 to-transparent opacity-0 group-focus-within/input:opacity-10 pointer-events-none transition-opacity duration-500" />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-label-sm text-status-error font-medium ms-1" />
                                        </FormItem>
                                    )}
                                />

                                {error && (
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-status-error/10 text-label-sm font-medium text-status-error border border-status-error/20 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-14 mt-4 text-title-sm font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[0.98] active:scale-95 disabled:opacity-70 rounded-xl relative overflow-hidden group/btn flex items-center justify-center gap-2"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out" />
                                    <span className="relative flex items-center justify-center gap-2">
                                        {isSubmitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            t('reset_password')
                                        )}
                                    </span>
                                </Button>
                            </form>
                        </Form>
                    </div>
                ))}
            </div>
        </div>
    );
}
