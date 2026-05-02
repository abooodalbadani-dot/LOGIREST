'use client';
 
import { PERMISSION_MATRIX, type ResourceType, type ActionType, type UserRole } from '@/types/rbac';
import { Check, Minus, Shield, Key, Lock, Fingerprint } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/ui/metric-card';
import { useTranslations } from 'next-intl';
 
const ROLES: UserRole[] = ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'PROC_OFFICER', 'AUDITOR'];
const RESOURCES: ResourceType[] = ['grn', 'pr', 'po', 'issue', 'transfer', 'adjustment', 'stocktake', 'inventory', 'master_data', 'admin', 'reports'];
const ACTIONS: ActionType[] = ['view', 'create', 'edit', 'delete', 'post', 'approve'];
 
export function RolesViewerClient() {
 const t = useTranslations('admin');
 
 return (
 <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
 <PageHeader 
 title={t('roles_permissions') || 'Access Control Matrix'} description="Global authorization registry defining resource boundaries and operational privileges"
 />
 
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <MetricCard
 label="Registered Roles"
 value={ROLES.length}
 icon={Key}
 trend="active"
 />
 <MetricCard
 label="Defined Resources"
 value={RESOURCES.length}
 icon={Lock}
 trend="active"
 color="amber"
 />
 <MetricCard
 label="RBAC Enforcement"
 value="Strict"
 icon={Shield}
 trend="active"
 color="emerald"
 />
 </div>
 
 <div className="bg-surface-container-low rounded-[2.5rem] overflow-hidden ambient-shadow">
 <div className="p-8 bg-surface-container-low/50">
 <div className="flex items-center gap-3 text-cyan-500 font-bold text-label-xs uppercase">
 <Fingerprint className="w-4 h-4" />
 Authorization Matrix
 </div>
 </div>
 
 <div className="overflow-x-auto">
 <table className="w-full text-start border-collapse">
 <thead>
 <tr className="bg-surface-container-low">
 <th className="sticky start-0 z-20 bg-surface-container-low h-14 px-8 text-label-xs font-bold uppercase text-muted-foreground/60">Resource</th>
 {ROLES.map((role) => (
 <th key={role} className="p-0 border-none" colSpan={ACTIONS.length}>
 <div className="flex flex-col">
 <div className="h-14 flex items-center justify-center text-label-xs font-bold uppercase bg-surface-container-high/40 text-cyan-500">
 {role}
 </div>
 <div className="grid grid-cols-6">
 {ACTIONS.map((action) => (
 <div key={action} className="p-2 text-center text-label-xxs font-bold uppercase text-muted-foreground/40 bg-surface-container-highest/10">
 {action.substring(0, 3)}
 </div>
 ))}
 </div>
 </div>
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-none">
 {RESOURCES.map((resource, i) => (
 <tr key={resource} className={`group transition-all h-14 ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/60'}`}>
 <td className={`sticky start-0 z-10 p-4 px-8 font-mono text-label-xs font-bold uppercase text-muted-foreground/40 transition-all group-hover:text-cyan-500 ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/60'}`}>
 {resource.replace('_', ' ')}
 </td>
 {ROLES.map((role) => (
 <td key={`${role}- ${resource}`} className="p-0 border-none">
 <div className="grid grid-cols-6 h-full min-h-[44px]">
 {ACTIONS.map((action) => {
 const allowed = (PERMISSION_MATRIX[role]?.[resource] ?? []).includes(action);
 return (
 <div key={`${role}- ${resource}- ${action}`} className="flex items-center justify-center p-2 group/cell">
 {allowed ? (
 <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center animate-in zoom-in-50 duration-500">
 <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[4px]" />
 </div>
 ) : (
 <Minus className="w-3 h-3 text-foreground/5" />
 )}
 </div>
 );
 })}
 </div>
 </td>
 ))}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 
 <div className="flex items-center justify-center p-8 bg-surface-container-low/30 rounded-[2.5rem]">
 <p className="text-label-xs font-bold text-muted-foreground/40 uppercase text-center leading-relaxed max-w-2xl">
 The permission matrix is immutable in the current runtime environment. Changes require security clearance and deployment of a new RBAC manifest.
 </p>
 </div>
 </div>
 );
}