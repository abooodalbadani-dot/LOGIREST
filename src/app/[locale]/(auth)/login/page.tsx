'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/providers/AuthProvider';
import LocaleSwitcher from '@/components/shared/LocaleSwitcher';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const router = useRouter();
  const { login, user, isLoading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Session Guard: Automatic Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(`dashboard`);
    }
  }, [user, authLoading, router]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginValues) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(values.email, values.password);
      // router.replace handles redirection via useEffect, but we can also trigger it here
    } catch (err: any) {
      setError(t('invalid_credentials'));
      setIsSubmitting(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-surface-3 bg-surface-1/80 backdrop-blur-md shadow-2xl">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <LocaleSwitcher />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-brand-primary">
          {t('login_title')}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {t('login_subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@demo.com"
              className="bg-surface-2 border-surface-3"
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-neon-red">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              type="password"
              className="bg-surface-2 border-surface-3"
              {...register('password')}
            />
            {errors.password && <p className="text-xs text-neon-red">{errors.password.message}</p>}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded bg-red-500/10 border border-red-500/20 text-xs text-neon-red">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-11 text-base" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('sign_in')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
