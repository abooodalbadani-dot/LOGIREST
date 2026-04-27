'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, ArrowLeft, Mail, CheckCircle2, Loader2, Lock } from 'lucide-react';
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
  const locale = params.locale as string;

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
    } catch (err) {
      setError(t('invalid_credentials')); // Fallback error
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full max-w-md p-8 bg-surface-1 rounded-2xl border border-surface-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 text-center relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 blur-3xl rounded-full" />

        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-2 tracking-tight">{t('email_sent')}</h2>
        <p className="text-on-surface-muted mb-8 text-sm leading-relaxed">
          {t('email_sent_desc', { email: form.getValues('email') })}
        </p>
        <Link
          href={`/${locale}/login`}
          className="inline-flex items-center gap-2 text-cyan-500 hover:text-cyan-500/80 font-medium transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 rtl:group-hover:translate-x-1" />
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
        <h1 className="text-2xl font-bold text-on-surface tracking-tight">{t('forgot_password')}</h1>
        <p className="text-on-surface-muted mt-2 text-sm">
          {t('forgot_password_desc')}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 relative">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium text-on-surface ml-1 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-on-surface-muted" />
                  {t('email')}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="name@example.com"
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
            className="w-full h-12 text-base font-bold bg-cyan-500 hover:bg-cyan-500/90 text-surface-0 shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              t('send_reset_link')
            )}
          </Button>

          <div className="text-center mt-6">
            <Link
              href={`/${locale}/login`}
              className="text-sm text-on-surface-muted hover:text-cyan-500 transition-colors inline-flex items-center gap-2 group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 rtl:group-hover:translate-x-1" />
              {t('back_to_login')}
            </Link>
          </div>
        </form>
      </Form>
    </div>
  );
}
