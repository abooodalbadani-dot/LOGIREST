'use client';
 
import { useState, ComponentType } from 'react';
import { PERMISSION_MATRIX, type ResourceType, type ActionType, type UserRole } from '@/types/rbac';
import { 
  Check, 
  Minus, 
  Shield, 
  Key, 
  Lock, 
  Fingerprint, 
  Eye, 
  Database, 
  ClipboardCheck, 
  ShieldCheck, 
  Sliders, 
  ShieldAlert, 
  Activity,
  FileCheck
} from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';
import { useTranslations } from 'next-intl';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
 
const ROLES: UserRole[] = ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'PROC_OFFICER', 'AUDITOR'];
const RESOURCES: ResourceType[] = ['grn', 'pr', 'po', 'issue', 'transfer', 'adjustment', 'stocktake', 'inventory', 'master_data', 'admin', 'reports'];
const ACTIONS: ActionType[] = ['view', 'create', 'edit', 'delete', 'post', 'approve'];

// Custom mapping for military-grade operational role icons
const ROLE_ICONS: Partial<Record<UserRole, ComponentType<{ className?: string }>>> = {
  ADMIN: ShieldAlert,
  INV_MGR: Database,
  WH_KEEPER: Lock,
  PROC_OFFICER: ClipboardCheck,
  AUDITOR: Eye
};

export function RolesViewerClient() {
  const t = useTranslations('admin');
  const [hoveredCell, setHoveredCell] = useState<{ resource: ResourceType; role: UserRole; action: ActionType } | null>(null);
  
  return (
    <MasterDataFormLayout
      title={t('roles_permissions')}
      backHref="/admin/roles"
      isSaving={false}
      onSubmit={() => {}}
      resource="admin"
      saveAction="view"
      hideSave={true}
    >
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 relative">
        {/* Subtle decorative glow overlays */}
        <div className="absolute top-10 left-1/3 w-80 h-80 bg-operational-cyan/5 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

        {/* Metrics bento-style cards row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            label={t('matrix.registered_roles')}
            value={ROLES.length}
            icon={Key}
            trend="active"
          />
          <MetricCard
            label={t('matrix.defined_resources')}
            value={RESOURCES.length}
            icon={Lock}
            trend="active"
            color="amber"
          />
          <MetricCard
            label={t('matrix.rbac_enforcement')}
            value={t('matrix.strict')}
            icon={Shield}
            trend="active"
            color="emerald"
          />
        </div>
        
        {/* Translucent Matrix board container with heavy rounded-2.5rem curves */}
        <div className="bg-surface-container-low/60 backdrop-blur-lg rounded-[2.5rem] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] border border-white/10 relative group/matrix">
          <div className="absolute inset-0 bg-gradient-to-tr from-operational-cyan/[0.03] via-transparent to-emerald-500/[0.02] pointer-events-none" />
          
          {/* Dashboard Header Panel */}
          <div className="p-8 bg-surface-container-low/50 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-operational-cyan/10 rounded-xl border border-operational-cyan/20">
                <Fingerprint className="w-5 h-5 text-operational-cyan animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground uppercase tracking-widest">
                  {t('matrix.auth_matrix')}
                </h3>
                <p className="text-[9px] text-muted-foreground/50 uppercase font-bold tracking-widest mt-1">
                  Active Access Control List (ACL) Ruleset
                </p>
              </div>
            </div>
            <div className="flex items-center self-start sm:self-auto gap-2 px-3 py-1.5 rounded-full bg-operational-cyan/10 border border-operational-cyan/20 text-operational-cyan font-extrabold text-[9px] uppercase tracking-widest animate-pulse shadow-[0_0_15px_rgba(var(--operational-cyan-rgb),0.1)]">
              <span className="w-1.5 h-1.5 rounded-full bg-operational-cyan shadow-[0_0_8px_rgba(var(--operational-cyan-rgb),1)]" />
              {t('matrix.strict')}
            </div>
          </div>
          
          {/* Main Matrix table scroll wrapper */}
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-operational-cyan/10 scrollbar-track-transparent">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="bg-surface-container-low/80">
                  <th className="sticky start-0 z-20 bg-surface-container-low/95 backdrop-blur-md h-20 px-8 text-[10px] font-bold uppercase text-muted-foreground/60 tracking-[0.2em] text-start min-w-[200px] border-b border-white/5 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)]">
                    {t('matrix.resource')}
                  </th>
                  {ROLES.map((role) => {
                    const isRoleHovered = hoveredCell?.role === role;
                    const RoleIconComponent = ROLE_ICONS[role] || ShieldCheck;
                    return (
                      <th key={role} className="p-0 border-none" colSpan={ACTIONS.length}>
                        <div className="flex flex-col border-b border-white/5">
                          <div className={`h-20 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden px-4 border-x border-white/[0.02]
                            ${isRoleHovered ? 'bg-operational-cyan/10 text-operational-cyan shadow-[inset_0_-2px_0_0_#22d3ee]' : 'bg-surface-container-high/30 text-operational-cyan/70'}
                          `}>
                            {isRoleHovered && (
                              <span className="absolute inset-0 bg-operational-cyan/5 blur-xl pointer-events-none" />
                            )}
                            <div className="flex items-center gap-2 mb-1">
                              <RoleIconComponent className={cn("w-4 h-4 transition-transform duration-300", isRoleHovered ? "scale-110 text-operational-cyan" : "text-muted-foreground/40")} />
                              <span className="text-xs font-black uppercase tracking-wider">{role}</span>
                            </div>
                            <span className="text-[8px] opacity-45 uppercase font-medium tracking-widest hidden sm:inline">Operational Segment</span>
                          </div>
                          <div className="grid grid-cols-6 bg-surface-container-lowest/30">
                            {ACTIONS.map((action) => {
                              const isActionHovered = hoveredCell?.role === role && hoveredCell?.action === action;
                              return (
                                <div
                                  key={action}
                                  className={`p-2 h-10 flex items-center justify-center text-center text-[9px] font-extrabold uppercase transition-all duration-300 tracking-widest border-x border-white/[0.01]
                                    ${isActionHovered ? 'bg-operational-cyan/20 text-operational-cyan font-black border-b border-operational-cyan/35' : 'text-muted-foreground/30'}
                                  `}
                                >
                                  {action.substring(0, 3)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-none">
                {RESOURCES.map((resource, i) => {
                  const isRowHovered = hoveredCell?.resource === resource;
                  return (
                    <tr
                      key={resource}
                      className={`group transition-all duration-300 h-16 border-b border-white/[0.02]
                        ${i % 2 === 0 ? 'bg-surface-container-lowest/80' : 'bg-surface-container-low/40'}
                        ${isRowHovered ? 'bg-operational-cyan/[0.02]' : ''}
                      `}
                    >
                      {/* Left sticky resource descriptor */}
                      <td
                        className={`sticky start-0 z-10 p-4 px-8 font-mono text-xs font-extrabold uppercase transition-all duration-300 text-start shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)]
                          ${isRowHovered ? 'text-operational-cyan bg-surface-container-low border-r-2 border-operational-cyan' : 'text-muted-foreground/50'}
                          ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/60'}
                        `}
                      >
                        <span className="flex items-center gap-2">
                          <AnimatePresence>
                            {isRowHovered && (
                              <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                className="w-2 h-2 rounded-full bg-operational-cyan shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                              />
                            )}
                          </AnimatePresence>
                          {resource.replace('_', ' ')}
                        </span>
                      </td>
                      {ROLES.map((role) => (
                        <td key={`${role}-${resource}`} className="p-0 border-none">
                          <div className="grid grid-cols-6 h-full min-h-[64px]">
                            {ACTIONS.map((action) => {
                              const allowed = (PERMISSION_MATRIX[role]?.[resource] ?? []).includes(action);
                              const isCellHovered = hoveredCell?.resource === resource && hoveredCell?.role === role && hoveredCell?.action === action;
                              const isRowIntersected = hoveredCell?.resource === resource;
                              const isColIntersected = hoveredCell?.role === role && hoveredCell?.action === action;
                              
                              return (
                                <div
                                  key={`${role}-${resource}-${action}`}
                                  className={`flex items-center justify-center p-2 group/cell transition-all duration-200 cursor-crosshair min-h-[64px] border-x border-white/[0.01]
                                    ${isCellHovered ? 'bg-operational-cyan/20 scale-110 shadow-[0_0_20px_rgba(34,211,238,0.3)] ring-1 ring-operational-cyan/45 rounded-xl z-10' : ''}
                                    ${!isCellHovered && isRowIntersected && isColIntersected ? 'bg-operational-cyan/10' : ''}
                                    ${!isCellHovered && !isRowIntersected && isColIntersected ? 'bg-operational-cyan/[0.04]' : ''}
                                    ${!isCellHovered && isRowIntersected && !isColIntersected ? 'bg-operational-cyan/[0.02]' : ''}
                                  `}
                                  onMouseEnter={() => setHoveredCell({ resource, role, action })}
                                  onMouseLeave={() => setHoveredCell(null)}
                                >
                                  {allowed ? (
                                    <motion.div
                                      whileHover={{ scale: 1.25 }}
                                      transition={{ type: 'spring', stiffness: 450, damping: 12 }}
                                      className={`w-6.5 h-6.5 rounded-full flex items-center justify-center transition-all duration-300
                                        ${isCellHovered ? 'bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.6)] border border-emerald-400/40' : 'bg-emerald-500/10 border border-emerald-500/5'}
                                      `}
                                    >
                                      <Check className={`w-3.5 h-3.5 text-emerald-400 stroke-[3.5px] transition-transform duration-300 ${isCellHovered ? 'scale-110' : ''}`} />
                                    </motion.div>
                                  ) : (
                                    <Minus className={`w-3.5 h-3.5 transition-colors duration-300 ${isCellHovered ? 'text-operational-cyan/40 font-bold' : 'text-foreground/5'}`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Bottom Immutable Rules Info Card */}
        <div className="flex items-center justify-center p-8 bg-surface-container-low/30 backdrop-blur border border-white/5 rounded-[2.5rem] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-operational-cyan/[0.02] to-transparent pointer-events-none" />
          <p className="text-[10px] font-bold text-muted-foreground/40 uppercase text-center leading-relaxed max-w-2xl tracking-[0.15em] relative z-10 group-hover:text-muted-foreground/60 transition-colors duration-500">
            {t('matrix.immutable_note')}
          </p>
        </div>
      </div>
    </MasterDataFormLayout>
  );
}
