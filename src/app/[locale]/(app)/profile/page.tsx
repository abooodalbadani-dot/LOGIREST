'use client';

import { useTranslations } from 'next-intl';
import { User, Shield, Info, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/providers/AuthProvider';
import ChangePasswordClient from './ChangePasswordClient';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader 
        title={t('title')} 
        description={user.email}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Account Details */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-surface-3 bg-surface-1/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-brand-primary" />
                {t('details')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">{t('name')}</p>
                  <p className="font-medium">{user.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">{t('email')}</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">{t('role')}</p>
                  <p className="font-medium text-neon-cyan">{user.role}</p>
                </div>
              </div>

              <Separator className="bg-surface-3" />

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-brand-primary" />
                  <p className="text-sm font-medium">{t('assigned_scopes')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.scopes.map((scope, idx) => (
                    <div 
                      key={idx} 
                      className="px-3 py-1.5 rounded-lg border border-surface-3 bg-surface-2 text-xs"
                    >
                      {scope.branch_id || 'All Branches'} 
                      {scope.warehouse_id && ` • ${scope.warehouse_id}`}
                      {scope.department_id && ` • ${scope.department_id}`}
                    </div>
                  ))}
                  {user.scopes.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No specific scopes assigned (Global Access)</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Security/Password */}
        <div className="space-y-6">
          <ChangePasswordClient />
          
          <Card className="border-surface-3 bg-surface-1/50 border-dashed opacity-70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Shield className="w-4 h-4" />
                Two-Factor Auth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground italic">Coming soon in Phase 12 Security Audit</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
