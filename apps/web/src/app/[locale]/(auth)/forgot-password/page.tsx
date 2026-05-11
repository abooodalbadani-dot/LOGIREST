'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Mail, CheckCircle2, Loader2, Lock } from 'lucide-react';
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
import { ForgotPasswordSchema, ForgotPasswordInput, AuthSuccessResponseSchema } from '@/types/auth';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const params = useParams();
  const _locale = params.locale as string;

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      setError(null);
      await apiClient.post('/auth/forgot-password', AuthSuccessResponseSchema, data);
      setIsSubmitted(true);
    } catch (_err) {
      setError(t('invalid_credentials')); // Fallback error
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex-1 flex w-full items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md p-10 bg-surface-container-low/60 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 text-center relative overflow-hidden group">
          {/* Animated Glow effects */}
          <div className="absolute -top-32 -start-32 w-64 h-64 bg-status-success/20 blur-[64px] rounded-full mix-blend-screen animate-pulse" />
          <div className="absolute -bottom-32 -end-32 w-64 h-64 bg-operational-cyan/10 blur-[64px] rounded-full mix-blend-screen opacity-50" />

          <div className="relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-status-success/20 to-status-success/5 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-status-success/30 shadow-[0_0_40px_rgba(var(--status-success-rgb),0.2)] transform transition-transform duration-500 hover:scale-110">
              <CheckCircle2 className="w-10 h-10 text-status-success drop-shadow-md" />
            </div>
            <h2 className="text-headline-lg font-bold text-foreground mb-3 tracking-tight">{t('email_sent')}</h2>
            <p className="text-muted-foreground/70 mb-10 text-body-lg leading-relaxed px-4">
              {t('email_sent_desc', { email: form.getValues('email') })}
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full h-12 gap-2 text-surface-container-lowest bg-foreground hover:bg-foreground/90 font-bold rounded-xl transition-all hover:scale-[0.98] active:scale-95 group/btn"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover/btn:-translate-x-1 rtl:group-hover/btn:translate-x-1" />
              {t('back_to_login')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex w-full items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md p-10 bg-surface-container-low/60 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 relative overflow-hidden">
        {/* Animated Glow effects */}
        <div className="absolute -top-32 -end-32 w-64 h-64 bg-operational-cyan/20 blur-[64px] rounded-full mix-blend-screen animate-pulse" />
        <div className="absolute -bottom-32 -start-32 w-64 h-64 bg-primary/10 blur-[64px] rounded-full mix-blend-screen opacity-50" />

      <div className="relative z-10">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-operational-cyan/20 to-operational-cyan/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-operational-cyan/30 shadow-[0_0_30px_rgba(var(--operational-cyan-rgb),0.15)] transform transition-all hover:rotate-3">
            <Lock className="w-8 h-8 text-operational-cyan drop-shadow-sm" />
          </div>
          <h1 className="text-headline-lg font-bold text-foreground tracking-tight">{t('forgot_password')}</h1>
          <p className="text-muted-foreground/70 mt-3 text-body-md px-2">
            {t('forgot_password_desc')}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-2.5">
                  <FormLabel className="text-label-sm font-semibold uppercase tracking-wider text-muted-foreground ms-1 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {t('email')}
                  </FormLabel>
                  <FormControl>
                    <div className="relative group/input">
                      <Input
                        {...field}
                        type="email"
                        placeholder="name@example.com"
                        className="bg-surface-container-lowest/50 border-white/10 focus:border-operational-cyan focus:ring-1 focus:ring-operational-cyan/50 hover:bg-surface-container-lowest/80 transition-all py-6 h-14 rounded-xl text-body-lg px-4"
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-operational-cyan/20 to-transparent opacity-0 group-focus-within/input:opacity-10 pointer-events-none transition-opacity duration-500" />
                    </div>
                  </FormControl>
                  <FormMessage className="text-label-sm text-status-error font-medium" />
                </FormItem>
              )}
            />

            {error && (
              <div className="p-4 rounded-xl bg-status-error/10 border border-status-error/20 text-status-error text-label-sm animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-status-error animate-pulse" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 text-title-sm font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[0.98] active:scale-95 disabled:opacity-70 rounded-xl relative overflow-hidden group/btn mt-2"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  t('send_reset_link')
                )}
              </span>
            </Button>

            <div className="text-center pt-6 pb-2">
              <Link
                href="/login"
                className="text-label-sm font-semibold uppercase tracking-wide text-muted-foreground/80 hover:text-operational-cyan transition-colors inline-flex items-center gap-2 group/link"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover/link:-translate-x-1 rtl:group-hover/link:translate-x-1" />
                {t('back_to_login')}
              </Link>
            </div>
          </form>
        </Form>
      </div>
    </div>
    </div>
  );
}
