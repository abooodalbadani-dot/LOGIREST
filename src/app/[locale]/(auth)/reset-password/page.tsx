'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
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

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
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
        router.push(`/${locale}/login`);
      }, 3000);
    } catch (err) {
      setError(t('invalid_credentials')); // Fallback error
    }
  };

  if (!token && !isSuccess) {
    return (
      <div className="w-full max-w-md p-8 bg-surface-1 rounded-2xl border border-surface-3 shadow-2xl text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-2">{t('invalid_reset_link')}</h2>
        <p className="text-on-surface-muted mb-8 text-sm">
          {t('invalid_reset_link_desc')}
        </p>
        <Link 
          href={`/${locale}/forgot-password`} 
          className="inline-flex items-center gap-2 text-cyan-500 hover:text-cyan-500/80 font-medium"
        >
          {t('forgot_password')}
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="w-full max-w-md p-8 bg-surface-1 rounded-2xl border border-surface-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 text-center relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 blur-3xl rounded-full" />
        
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-2 tracking-tight">{t('password_reset_success')}</h2>
        <p className="text-on-surface-muted mb-8 text-sm leading-relaxed">
          {t('password_reset_redirect')}
        </p>
        <Link 
          href={`/${locale}/login`} 
          className="inline-flex items-center gap-2 text-cyan-500 hover:text-cyan-500/80 font-medium transition-colors"
        >
          {t('back_to_login')}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 bg-surface-1 rounded-2xl border border-surface-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 blur-3xl rounded-full" />

      <div className="mb-8 text-center relative">
        <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
          <Lock className="w-6 h-6 text-cyan-500" />
        </div>
        <h1 className="text-2xl font-bold text-on-surface tracking-tight">{t('reset_password')}</h1>
        <p className="text-on-surface-muted mt-2 text-sm">
          {t('reset_password_desc')}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 relative">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium text-on-surface ml-1">{t('new_password')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      className="bg-surface-2 border-surface-3 focus:border-cyan-500 transition-all py-6 h-12 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-muted hover:text-on-surface transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium text-on-surface ml-1">{t('confirm_new_password')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    className="bg-surface-2 border-surface-3 focus:border-cyan-500 transition-all py-6 h-12"
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-in fade-in duration-300">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full h-12 mt-2 text-base font-bold bg-cyan-500 hover:bg-cyan-500/90 text-surface-0 shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              t('reset_password')
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
