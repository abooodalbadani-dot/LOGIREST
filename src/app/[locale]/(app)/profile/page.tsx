'use client';

import { useTranslations } from 'next-intl';
import { User, Shield, Info, MapPin, Globe, BadgeCheck, Fingerprint } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/providers/AuthProvider';
import ChangePasswordClient from './ChangePasswordClient';
import LocaleSwitcher from '@/components/shared/LocaleSwitcher';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader 
          title={t('title')} 
          description={user.email}
        />
        <div className="flex items-center gap-3 p-1.5 bg-surface-1/50 backdrop-blur-md border border-surface-3 rounded-2xl shadow-xl">
          <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-500">
            <Globe className="w-4 h-4" />
          </div>
          <div className="flex flex-col pr-4 border-r border-surface-3">
            <span className="text-[10px] font-black text-on-surface-muted uppercase tracking-widest leading-none mb-1">Language Preference</span>
            <LocaleSwitcher />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Account Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-surface-3 bg-surface-1/50 backdrop-blur-md relative overflow-hidden group">
            {/* Ghost Border - Top Glow */}
            <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent shadow-[0_0_15px_rgba(0,229,255,0.2)]" />
            
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <Fingerprint className="w-5 h-5 text-cyan-500" />
                  </div>
                  <CardTitle className="text-xl">{t('details')}</CardTitle>
                </div>
                <div className="px-3 py-1 bg-surface-2 border border-surface-3 rounded-full flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="text-[10px] font-black text-on-surface uppercase tracking-wider">Verified Identity</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <p className="text-[10px] text-on-surface-muted uppercase font-black tracking-widest">{t('name')}</p>
                  <p className="text-lg font-bold text-on-surface">{user.name}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] text-on-surface-muted uppercase font-black tracking-widest">{t('email')}</p>
                  <p className="text-lg font-bold text-on-surface">{user.email}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] text-on-surface-muted uppercase font-black tracking-widest">{t('role')}</p>
                  <div className="inline-flex px-2.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-xs font-black uppercase tracking-tighter">
                    {user.role}
                  </div>
                </div>
              </div>

              <Separator className="bg-surface-3/50" />

              <div className="space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-cyan-500" />
                  <p className="text-xs font-black uppercase tracking-widest text-on-surface-muted">{t('assigned_scopes')}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {user.scopes.map((scope, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-3 p-3 rounded-xl border border-surface-3 bg-surface-2/30 hover:border-cyan-500/30 hover:bg-surface-2/50 transition-all group/scope"
                    >
                      <div className="w-2 h-2 rounded-full bg-cyan-500 group-hover:shadow-[0_0_8px_rgba(0,229,255,0.6)] transition-all" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-on-surface">
                          {scope.branch_id || 'All Branches'}
                        </span>
                        <span className="text-[10px] text-on-surface-muted font-medium">
                          {scope.warehouse_id ? `Warehouse: ${scope.warehouse_id}` : 'Global Warehouse Access'}
                          {scope.department_id && ` • Dept: ${scope.department_id}`}
                        </span>
                      </div>
                    </div>
                  ))}
                  {user.scopes.length === 0 && (
                    <div className="col-span-full py-8 text-center border-2 border-dashed border-surface-3 rounded-2xl">
                      <p className="text-sm text-on-surface-muted italic">No specific operational scopes assigned (Global Access)</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Security/Password */}
        <div className="space-y-6">
          <ChangePasswordClient />
          
          <Card className="border-surface-3 bg-surface-1/50 border-dashed backdrop-blur-sm group/security">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black flex items-center gap-2 text-on-surface-muted uppercase tracking-widest">
                <Shield className="w-4 h-4 group-hover:text-cyan-500 transition-colors" />
                Enterprise Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2/20 border border-surface-3 opacity-50 grayscale">
                <div className="w-8 h-8 rounded bg-surface-3 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-on-surface-muted rounded-sm" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold">2FA Authentication</span>
                  <span className="text-[10px]">Phase 12 Requirement</span>
                </div>
              </div>
              <p className="text-[10px] text-on-surface-muted leading-relaxed">
                Security audits and multi-factor authentication are scheduled for the next deployment cycle.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
