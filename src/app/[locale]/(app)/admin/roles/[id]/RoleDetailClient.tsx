'use client';
import { useState, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAdminRole, useUpdateRolePermissions, type Permission, type RoleAction } from '@/features/admin/hooks/useAdminRoles';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { ArrowLeft, ShieldCheck, Lock, Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const ACTION_KEYS: RoleAction[] = ['view', 'create', 'edit', 'approve', 'post'];

export function RoleDetailClient({ locale, id }: { locale: string; id: string }) {
 const t = useTranslations('admin.roles');
 const tCommon = useTranslations('common');
 const router = useRouter();
 const { data: role, isLoading } = useAdminRole(id);
 const { mutateAsync: updatePermissions, isPending } = useUpdateRolePermissions();

 const [localPermissions, setLocalPermissions] = useState<Permission[]>([]);
 const [isConfirmOpen, setIsConfirmOpen] = useState(false);

 const isAdmin = id === 'ADMIN';

 const [prevRoleId, setPrevRoleId] = useState<string | null>(null);
 
 if (role && role.id !== prevRoleId) {
 setPrevRoleId(role.id);
 setLocalPermissions(JSON.parse(JSON.stringify(role.permissions)));
 }

 const handleToggle = (module: string, action: RoleAction, checked: boolean) => {
 if (isAdmin) return;

 setLocalPermissions(prev => prev.map(p => {
 if (p.module === module) {
 const newActions = { ...p.actions, [action]: checked };
 
 // Logical dependency: If any action is enabled, 'view' must be enabled
 if (checked && action !== 'view') {
 newActions.view = true;
 }
 
 // If 'view' is disabled, all other actions must be disabled
 if (!checked && action === 'view') {
 newActions.create = false;
 newActions.edit = false;
 newActions.approve = false;
 newActions.post = false;
 }

 return { ...p, actions: newActions };
 }
 return p;
 }));
 };

 const hasChanges = useMemo(() => {
 if (!role) return false;
 return JSON.stringify(role.permissions) !== JSON.stringify(localPermissions);
 }, [role, localPermissions]);

 const isValid = useMemo(() => {
 return localPermissions.some(p => p.actions.view);
 }, [localPermissions]);

 const onSave = async () => {
 await updatePermissions({ id, permissions: localPermissions });
 setIsConfirmOpen(false);
 };

 if (isLoading) {
 return (
 <div className="space-y-8">
 <Skeleton className="h-12 w-64 bg-outline-low" />
 <Skeleton className="h-[500px] w-full bg-outline-low" />
 </div>
 );
 }

 return (
 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-outline-low pb-8">
 <div className="space-y-4">
 <Link 
 href={`/${locale}/admin/roles`}
 className="inline-flex items-center gap-2 text-label-xs font-semibold uppercase text-muted-foreground hover:text-cyan-500 transition-colors"
 >
 <ArrowLeft className="w-3 h-3 rtl:rotate-180" />
 {tCommon('back')}
 </Link>
 <div className="space-y-1">
 <h1 className="text-headline-lg font-semibold uppercase text-foreground flex items-center gap-4">
 {isAdmin ? <Lock className="w-8 h-8 text-rose-500" /> : <ShieldCheck className="w-8 h-8 text-cyan-500" />}
 {role?.name}
 </h1>
 <p className="text-label-sm text-muted-foreground/60 uppercase font-bold max-w-xl">
 {role?.description}
 </p>
 </div>
 </div>

 {!isAdmin && (
 <div className="flex items-center gap-4">
 <Button
 onClick={() => setIsConfirmOpen(true)}
 disabled={!hasChanges || !isValid || isPending}
 className="h-12 px-8 rounded-sm bg-cyan-500 text-black hover:bg-cyan-400 disabled:bg-surface-container-highest disabled:text-muted-foreground transition-all font-semibold uppercase text-label-xs gap-2 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
 >
 <Save className="w-4 h-4" />
 {t('save_changes')}
 </Button>
 </div>
 )}
 </div>

 {isAdmin && (
 <div className="p-6 bg-rose-500/5 border border-rose-500/10 rounded-sm flex items-center gap-4">
 <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
 <Lock className="w-5 h-5 text-rose-500" />
 </div>
 <div>
 <h3 className="text-label-sm font-semibold uppercase text-rose-500">{t('admin_role_locked')}</h3>
 <p className="text-label-xs text-rose-500/60 font-bold uppercase">Administrative policies are immutable for system integrity</p>
 </div>
 </div>
 )}

 {!isValid && !isAdmin && (
 <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-sm flex items-center gap-3">
 <AlertCircle className="w-4 h-4 text-amber-500" />
 <span className="text-label-xs font-semibold uppercase text-amber-500">{t('at_least_one_view')}</span>
 </div>
 )}

 <div className="bg-surface-container-low border border-outline-low rounded-sm overflow-hidden shadow-2xl shadow-black/60">
 <div className="overflow-x-auto">
 <table className="w-full text-start border-collapse">
 <thead>
 <tr className="bg-surface-container-highest/30 border-b border-outline-low">
 <th className="py-6 px-8 text-label-xs font-semibold uppercase text-muted-foreground w-1/3 text-start">
 {t('module')}
 </th>
 {ACTION_KEYS.map(action => (
 <th key={action} className="py-6 px-8 text-label-xs font-semibold uppercase text-muted-foreground text-center">
 {t(action)}
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-outline-low/40">
 {localPermissions.map((perm) => (
 <tr key={perm.module} className="hover:bg-surface-container-highest/5 transition-colors group">
 <td className="py-8 px-8">
 <div className="flex flex-col gap-1">
 <span className="text-body-md font-semibold uppercase text-foreground group-hover:text-cyan-500 transition-colors">
 {perm.module}
 </span>
 <span className="text-label-xxs text-muted-foreground/30 font-bold uppercase">
 Namespace: system.{perm.module.toLowerCase()}
 </span>
 </div>
 </td>
 {ACTION_KEYS.map(action => {
 const isChecked = perm.actions[action];
 const isDisabled = isAdmin || isPending || (action !== 'view' && !perm.actions.view);
 
 return (
 <td key={action} className="py-8 px-8 text-center">
 <div className="flex justify-center">
 <div className={`relative flex items-center justify-center w-10 h-10 rounded-sm border transition-all ${ isChecked ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-surface-container-highest/10 border-outline-low' } ${isDisabled ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:border-cyan-500/80'}`}>
 <Checkbox
 checked={isChecked}
 onCheckedChange={(checked) => handleToggle(perm.module, action, !!checked)}
 disabled={isDisabled}
 className={`w-6 h-6 border-none shadow-none rounded-none data-[state=checked]:bg-transparent data-[state=checked]:text-cyan-500`}
 />
 </div>
 </div>
 </td>
 );
 })}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 <PostConfirmDialog
 open={isConfirmOpen}
 onOpenChange={setIsConfirmOpen}
 onConfirm={onSave}
 title={t('confirm_update_permissions')}
 description={t('confirm_warning')}
 isLoading={isPending}
 confirmKeyword={id}
 />
 </div>
 );
}
