'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/providers/AuthProvider';
import { useState } from 'react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, 'password');
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-primary-dim/10 blur-[120px] rounded-full pointer-events-none" />

      <Card className="w-full max-w-md border-white/10 bg-surface-1/90 backdrop-blur-xl shadow-2xl relative z-10">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary-dim to-brand-primary">
            LogiRest
          </CardTitle>
          <p className="text-sm text-muted-foreground">تسجيل الدخول للنظام</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">البريد الإلكتروني</label>
              <Input 
                type="email" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@logirest.com" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">كلمة المرور</label>
              <Input type="password" required placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full mt-4">تسجيل الدخول</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
