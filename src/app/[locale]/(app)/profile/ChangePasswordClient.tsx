'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordValues = z.infer<typeof passwordSchema>;

export default function ChangePasswordClient() {
  const t = useTranslations('profile');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (values: PasswordValues) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSuccess(true);
    toast.success(t('password_updated'));
    reset();
    setTimeout(() => setIsSuccess(false), 5000);
  };

  return (
    <Card className="border-surface-3 bg-surface-1/50">
      <CardHeader>
        <CardTitle>{t('security')}</CardTitle>
        <CardDescription>{t('change_password')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-brand-primary" />
            <p className="text-brand-primary font-medium">{t('password_updated')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t('current_password')}</Label>
              <Input
                id="currentPassword"
                type="password"
                className="bg-surface-2 border-surface-3"
                {...register('currentPassword')}
              />
              {errors.currentPassword && <p className="text-xs text-neon-red">{errors.currentPassword.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('new_password')}</Label>
              <Input
                id="newPassword"
                type="password"
                className="bg-surface-2 border-surface-3"
                {...register('newPassword')}
              />
              {errors.newPassword && <p className="text-xs text-neon-red">{errors.newPassword.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirm_password')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                className="bg-surface-2 border-surface-3"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && <p className="text-xs text-neon-red">{errors.confirmPassword.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('change_password')}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
