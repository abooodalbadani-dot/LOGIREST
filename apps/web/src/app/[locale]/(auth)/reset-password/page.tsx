'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Lock,
    Eye,
    EyeOff,
    CheckCircle2,
    Loader2,
    AlertCircle,
    ShieldCheck,
    Activity,
    ArrowLeft
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { AuthSuccessResponseSchema } from '@/types/auth';
import LocaleSwitcher from '@/components/shared/LocaleSwitcher';

const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
    const t = useTranslations('auth');
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [showPassword, setShowPassword] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<ResetPasswordValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            token: token || '',
            password: '',
            confirmPassword: '',
        },
    });

    useEffect(() => {
        if (token) {
            setValue('token', token);
        }
    }, [token, setValue]);

    const onSubmit = async (data: ResetPasswordValues) => {
        try {
            setError(null);
            await apiClient.post('/auth/reset-password', AuthSuccessResponseSchema, data);
            setIsSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (_err) {
            setError(t('invalid_credentials'));
        }
    };

    const renderSuccess = () => (
        <div className="w-full max-w-[1600px] p-12 bg-white dark:bg-[#0a0a0a] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl text-center relative z-10 animate-in fade-in zoom-in duration-500 flex-shrink-0">
            <div className="w-16 h-16 bg-status-success/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-status-success/20">
                <CheckCircle2 className="w-8 h-8 text-status-success" />
            </div>
            <h2 className="text-title-sm font-bold text-black dark:text-white mb-3 tracking-tight">{t('password_reset_success')}</h2>
            <p className="text-[11px] text-black/60 dark:text-white/60 mb-8 leading-relaxed px-4">
                {t('password_reset_redirect')}
            </p>
            <button
                onClick={() => router.push('/login')}
                className="w-full h-10 flex items-center justify-center gap-2 text-[10px] font-bold bg-black dark:bg-white text-white dark:text-[#050505] hover:bg-operational-cyan transition-all rounded-lg uppercase tracking-widest shadow-lg shadow-black/5 dark:shadow-white/5"
            >
                {t('back_to_login')}
            </button>
        </div>
    );

    const renderInvalidToken = () => (
        <div className="w-full max-w-[1600px] p-12 bg-white dark:bg-[#0a0a0a] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl text-center relative z-10 animate-in fade-in zoom-in duration-500 flex-shrink-0">
            <div className="w-16 h-16 bg-status-error/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-status-error/20">
                <AlertCircle className="w-8 h-8 text-status-error" />
            </div>
            <h2 className="text-title-sm font-bold text-black dark:text-white mb-3 tracking-tight">{t('invalid_reset_link')}</h2>
            <p className="text-[11px] text-black/60 dark:text-white/60 mb-8 leading-relaxed px-4">
                {t('invalid_reset_link_desc')}
            </p>
            <button
                onClick={() => router.push('/forgot-password')}
                className="w-full h-10 flex items-center justify-center gap-2 text-[10px] font-bold bg-black dark:bg-white text-white dark:text-[#050505] hover:bg-operational-cyan transition-all rounded-lg uppercase tracking-widest shadow-lg shadow-black/5 dark:shadow-white/5"
            >
                {t('forgot_password')}
            </button>
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row w-full min-h-screen bg-[#f7f9ff] dark:bg-[#050505] selection:bg-operational-cyan/30 text-[#181c20] dark:text-white overflow-x-hidden">
            {/* Left Panel: Brand Experience */}
            <div className="hidden lg:flex lg:basis-1/2 relative flex-col justify-between p-8 xl:p-12 overflow-hidden border-e border-black/5 dark:border-white/5 bg-white dark:bg-[#050505] shrink-0">
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/kitchen-bg.png"
                        alt="Professional Kitchen"
                        fill
                        priority
                        className="object-cover scale-105"
                    />
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/70 backdrop-blur-[1px]" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-white dark:from-[#050505] via-white/40 dark:via-[#050505]/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/90 dark:to-[#050505]/90" />

                    {/* Dynamic accent glows */}
                    <div className="absolute -top-40 -start-40 w-[600px] h-[600px] bg-operational-cyan/10 blur-[120px] rounded-full pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
                    <div className="absolute bottom-1/4 -end-20 w-[400px] h-[400px] bg-primary/10 blur-[100px] rounded-full pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
                </div>

                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 px-4 py-2 rounded-2xl">
                        <Activity className="w-4 h-4 text-operational-cyan animate-pulse" />
                        <span className="text-[10px] font-bold text-black/70 dark:text-white/70 uppercase tracking-widest">{t('login.system_online')}</span>
                    </div>
                    <LocaleSwitcher />
                </div>

                <div className="relative z-10 mt-auto w-full flex flex-col items-start">
                    <div className="inline-flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 bg-operational-cyan/10 border border-operational-cyan/30 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.15)] group overflow-hidden">
                            <Image src="/logoicon.png" alt="LogiRest Logo" width={36} height={36} className="object-contain" />
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
                        <span className="text-[10px] text-black/60 dark:text-white/60 font-bold tracking-widest">ACTIVE OPERATORS</span>
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
                            <Image src="/logoicon.png" alt="LogiRest Logo" width={28} height={28} className="object-contain" />
                        </div>
                        <h1 className="text-display-xs font-black text-[#02617c] tracking-tighter text-center">{t('login.hero_title')}</h1>
                        <div className="mt-1 px-1.5 py-0.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded text-[8px] font-mono text-black/40 dark:text-white/40 uppercase">
                            {t('login.version')}
                        </div>
                    </div>

                    {isSuccess ? renderSuccess() : (!token ? renderInvalidToken() : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="mb-6 text-center lg:text-start">
                                <h2 className="text-title-sm font-bold text-black dark:text-white mb-1 tracking-tight">
                                    {t('reset_password')}
                                </h2>
                                <p className="text-[10px] text-black/60 dark:text-white/60">
                                    {t('reset_password_desc')}
                                </p>
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/80 dark:text-white/80 ms-1 flex items-center gap-2">
                                        <Lock className="w-3 h-3" />
                                        {t('new_password')}
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            className="w-full bg-black/[0.02] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 focus:border-operational-cyan focus:ring-2 focus:ring-operational-cyan/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-all h-9 rounded text-[11px] ps-4 pe-10 outline-none text-black dark:text-white"
                                            {...register('password')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 end-0 pe-3 flex items-center text-black/30 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-[10px] text-status-error font-medium ms-1 mt-0.5">{errors.password.message}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/80 dark:text-white/80 ms-1">
                                        {t('confirm_new_password')}
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="password"
                                            className="w-full bg-black/[0.02] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 focus:border-operational-cyan focus:ring-2 focus:ring-operational-cyan/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-all h-9 rounded text-[11px] px-4 outline-none text-black dark:text-white"
                                            {...register('confirmPassword')}
                                        />
                                    </div>
                                    {errors.confirmPassword && <p className="text-[10px] text-status-error font-medium ms-1 mt-0.5">{errors.confirmPassword.message}</p>}
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-status-error/10 text-[11px] font-medium text-status-error border border-status-error/20">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-9 text-[10px] font-bold bg-black dark:bg-white text-white dark:text-[#050505] hover:bg-operational-cyan transition-all duration-300 rounded uppercase tracking-[0.15em] disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : t('reset_password')}
                                </button>
                            </form>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
