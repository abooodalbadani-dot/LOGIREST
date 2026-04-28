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
        title={t('roles_permissions') || 'Access Control Matrix'} 
        description="Global authorization registry defining resource boundaries and operational privileges"
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
 
      <div className="bg-surface-container-low border border-outline-low rounded-sm overflow-hidden shadow-2xl">
        <div className="p-6 bg-surface-container-high border-b border-outline-low">
          <div className="flex items-center gap-3 text-cyan-500 font-black text-[10px] uppercase tracking-[0.25em]">
            <Fingerprint className="w-4 h-4" />
            Authorization Matrix
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="bg-surface-container-medium/50 border-b border-white/10">
                <th className="sticky start-0 z-20 bg-surface-container-medium p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-e border-white/10">Resource</th>
                {ROLES.map((role) => (
                  <th key={role} className="p-0 border-e border-white/5 last:border-0" colSpan={ACTIONS.length}>
                    <div className="flex flex-col">
                      <div className="p-2 text-center text-[10px] font-black uppercase tracking-[0.2em] bg-surface-container-highest/20 border-b border-white/5 text-cyan-500">
                        {role}
                      </div>
                      <div className="grid grid-cols-6 divide-s divide-white/5">
                        {ACTIONS.map((action) => (
                          <div key={action} className="p-2 text-center text-[8px] font-bold uppercase tracking-tighter text-muted-foreground/60 bg-black/20">
                            {action.substring(0, 3)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {RESOURCES.map((resource) => (
                <tr key={resource} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="sticky start-0 z-10 bg-surface-container-low p-4 font-mono text-[11px] font-black uppercase tracking-widest text-muted-foreground border-e border-white/10 group-hover:text-foreground group-hover:bg-surface-container-medium transition-all">
                    {resource.replace('_', ' ')}
                  </td>
                  {ROLES.map((role) => (
                    <td key={`${role}-${resource}`} className="p-0 border-e border-white/5 last:border-0">
                      <div className="grid grid-cols-6 divide-s divide-white/5 h-full min-h-[44px]">
                        {ACTIONS.map((action) => {
                          const allowed = (PERMISSION_MATRIX[role]?.[resource] ?? []).includes(action);
                          return (
                            <div key={`${role}-${resource}-${action}`} className="flex items-center justify-center p-2 group/cell">
                              {allowed ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-in zoom-in-50 duration-500">
                                  <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[4px]" />
                                </div>
                              ) : (
                                <Minus className="w-3 h-3 text-white/5" />
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
 
      <div className="flex items-center justify-center p-8 bg-surface-container-low/30 rounded-sm border border-dashed border-outline-low">
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest text-center leading-relaxed">
          The permission matrix is immutable in the current runtime environment. Changes require security clearance and deployment of a new RBAC manifest.
        </p>
      </div>
    </div>
  );
}