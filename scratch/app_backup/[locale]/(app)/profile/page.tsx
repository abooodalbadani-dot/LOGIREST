'use client';

import { useTranslations } from 'next-intl';
import { Shield, MapPin, Globe, BadgeCheck, Fingerprint } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/providers/AuthProvider';
import ChangePasswordClient from './ChangePasswordClient';
import LocaleSwitcher from '@/components/shared/LocaleSwitcher';

export default function ProfilePage() {
 const t = useTranslations('profile');
 const tc = useTranslations('common');
 const { user } = useAuth();

 if (!user) return null;

 return (
 <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
 <PageHeader 
 title={t('title')} 
 description={user.email}
 />
 <div className="flex items-center gap-3 p-1.5 bg-surface-container-low/50 backdrop-blur-md border border-border-muted/50 rounded-2xl shadow-xl">
 <div className="p-2 bg-operational-cyan/10 rounded-xl text-operational-cyan">
 <Globe className="w-4 h-4" />
 </div>
 <div className="flex flex-col pe-4 border-e border-border-muted/50">
 <span className="text-label-xs font-semibold text-muted-foreground uppercase leading-none mb-1">{t('language_preference')}</span>
 <LocaleSwitcher />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Left Column: Account Details */}
 <div className="lg:col-span-2 space-y-6">
 <Card className="border-border-muted/50 bg-surface-container-low/50 backdrop-blur-md relative overflow-hidden group">
 {/* Ghost Border - Top Glow */}
 <div className="absolute -top-[1px] start-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-operational-cyan/40 to-transparent shadow-[0_0_15px_rgba(var(--operational-cyan-rgb),0.2)]" />
 
 <CardHeader className="pb-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="p-2 bg-operational-cyan/10 rounded-lg">
 <Fingerprint className="w-5 h-5 text-operational-cyan" />
 </div>
 <CardTitle className="text-title-lg">{t('details')}</CardTitle>
 </div>
 <div className="px-3 py-1 bg-surface-container-low border border-border-muted/50 rounded-full flex items-center gap-1.5">
 <BadgeCheck className="w-3.5 h-3.5 text-operational-cyan" />
 <span className="text-label-xs font-semibold text-foreground uppercase">{t('verified_identity')}</span>
 </div>
 </div>
 </CardHeader>
 <CardContent className="space-y-8">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
 <div className="space-y-1.5">
 <p className="text-label-xs text-muted-foreground uppercase font-semibold">{t('name')}</p>
 <p className="text-title-sm font-bold text-foreground">{user.name}</p>
 </div>
 <div className="space-y-1.5">
 <p className="text-label-xs text-muted-foreground uppercase font-semibold">{t('email')}</p>
 <p className="text-title-sm font-bold text-foreground">{user.email}</p>
 </div>
 <div className="space-y-1.5">
 <p className="text-label-xs text-muted-foreground uppercase font-semibold">{t('role')}</p>
 <div className="inline-flex px-2.5 py-0.5 rounded-md bg-operational-cyan/10 border border-operational-cyan/20 text-operational-cyan text-label-sm font-semibold uppercase">
 {user.role}
 </div>
 </div>
 </div>

 <Separator className="bg-border-muted/50" />

 <div className="space-y-5">
 <div className="flex items-center gap-2 mb-2">
 <MapPin className="w-4 h-4 text-operational-cyan" />
 <p className="text-label-sm font-semibold uppercase text-muted-foreground">{t('assigned_scopes')}</p>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {user.scopes.map((scope, idx) => (
 <div 
 key={idx} 
 className="flex items-center gap-3 p-3 rounded-xl border border-border-muted/50 bg-surface-container-lowest/30 hover:border-operational-cyan/30 hover:bg-surface-container-low/50 transition-all group/scope"
 >
 <div className="w-2 h-2 rounded-full bg-operational-cyan group-hover:shadow-[0_0_8px_rgba(var(--operational-cyan-rgb),0.6)] transition-all" />
 <div className="flex flex-col">
 <span className="text-label-sm font-bold text-foreground">
 {scope.branch_id || tc('actions.all_branches')}
 </span>
 <span className="text-label-xs text-muted-foreground font-medium">
 {scope.warehouse_id ? `${tc('warehouses.warehouses')}: ${scope.warehouse_id}` : t('global_access')}
 {scope.department_id && ` • Dept: ${scope.department_id}`}
 </span>
 </div>
 </div>
 ))}
 {user.scopes.length === 0 && (
 <div className="col-span-full py-8 text-center border-2 border-dashed border-border-muted/50 rounded-2xl">
 <p className="text-body-md text-muted-foreground italic">{t('global_access')}</p>
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
 
 <Card className="border-border-muted/50 bg-surface-container-low/50 border-dashed backdrop-blur-sm group/security">
 <CardHeader className="pb-3">
 <CardTitle className="text-body-md font-semibold flex items-center gap-2 text-muted-foreground uppercase">
 <Shield className="w-4 h-4 group-hover:text-operational-cyan transition-colors" />
 {t('enterprise_security')}
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low/20 border border-border-muted/50 opacity-50 grayscale">
 <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center">
 <div className="w-4 h-4 border-2 border-muted-foreground rounded-sm" />
 </div>
 <div className="flex flex-col">
 <span className="text-label-sm font-bold">{t('two_fa')}</span>
 <span className="text-label-xs">{t('phase_requirement', { phase: 12 })}</span>
 </div>
 </div>
 <p className="text-label-xs text-muted-foreground leading-relaxed">
 {tc('security_standard_desc')}
 </p>
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 );
}
