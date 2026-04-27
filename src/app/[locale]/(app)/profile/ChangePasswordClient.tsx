'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle2, ShieldCheck, Lock, KeyRound, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string().min(1, 'Confirmation is required'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
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
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsSuccess(true);
      toast.success(t('password_updated'));
      reset();
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-surface-3 bg-surface-1/50 backdrop-blur-md relative overflow-hidden group">
      {/* Ghost Border - Top Glow */}
      <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent shadow-[0_0_15px_rgba(0,229,255,0.3)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-cyan-500" />
          <CardTitle className="text-lg">{t('security')}</CardTitle>
        </div>
        <CardDescription>{t('change_password')}</CardDescription>
      </CardHeader>
      
      <CardContent className="relative z-10">
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="p-4 bg-cyan-500/10 rounded-full">
              <CheckCircle2 className="w-12 h-12 text-cyan-500" />
            </div>
            <div className="space-y-1">
              <p className="text-on-surface font-bold text-lg">{t('password_updated')}</p>
              <p className="text-sm text-on-surface-muted">Your security credentials are now synced.</p>
            </div>
            <Button variant="outline" onClick={() => setIsSuccess(false)} className="mt-2 border-surface-3">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="current_password" className="text-xs uppercase tracking-widest font-black text-on-surface-muted">
                {t('current_password')}
              </Label>
              <div className="relative group/input">
                <Input
                  id="current_password"
                  type="password"
                  className="bg-surface-2/50 border-surface-3 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500 transition-all pl-9"
                  {...register('current_password')}
                />
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-muted group-focus-within/input:text-cyan-500 transition-colors" />
              </div>
              {errors.current_password && (
                <div className="flex items-center gap-1.5 text-red-500 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <p className="text-[10px] font-bold">{errors.current_password.message}</p>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new_password" className="text-xs uppercase tracking-widest font-black text-on-surface-muted">
                {t('new_password')}
              </Label>
              <Input
                id="new_password"
                type="password"
                className="bg-surface-2/50 border-surface-3 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500 transition-all"
                {...register('new_password')}
              />
              {errors.new_password && (
                <div className="flex items-center gap-1.5 text-red-500 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <p className="text-[10px] font-bold">{errors.new_password.message}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password" className="text-xs uppercase tracking-widest font-black text-on-surface-muted">
                {t('confirm_password')}
              </Label>
              <Input
                id="confirm_password"
                type="password"
                className="bg-surface-2/50 border-surface-3 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500 transition-all"
                {...register('confirm_password')}
              />
              {errors.confirm_password && (
                <div className="flex items-center gap-1.5 text-red-500 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <p className="text-[10px] font-bold">{errors.confirm_password.message}</p>
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-surface-3 hover:bg-cyan-500 hover:text-black font-black uppercase tracking-widest transition-all h-11" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {t('change_password')}
                </div>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
