'use client';

import { useState, ComponentType } from 'react';
import { PERMISSION_MATRIX, type ResourceType, type ActionType, type UserRole } from '@/types/rbac';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import {
    Check,
    Minus,
    Shield,
    Key,
    Lock,
    Eye,
    Database,
    ClipboardCheck,
    ShieldCheck,
    Sliders,
    ShieldAlert,
    Activity,
    FileCheck,
    Fingerprint
} from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';
import { useTranslations, useLocale } from 'next-intl';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAdminRoles } from '@/features/admin/hooks/useAdminRoles';
import { Skeleton } from '@/components/ui/skeleton';

const RESOURCES: ResourceType[] = ['grn', 'pr', 'po', 'issue', 'transfer', 'adjustment', 'stocktake', 'inventory', 'master_data', 'admin', 'reports'];
const ACTIONS: ActionType[] = ['view', 'create', 'edit', 'delete', 'post', 'approve'];

// Custom mapping for military-grade operational role icons
const ROLE_ICONS: Record<UserRole, ComponentType<{ className?: string }>> = {
    ADMIN: ShieldAlert,
    GM: ShieldCheck,
    INV_MGR: Database,
    WH_KEEPER: Lock,
    PROC_OFFICER: ClipboardCheck,
    APPROVER: FileCheck,
    AUDITOR: Eye,
    VIEWER: Eye,
    KITCHEN_CHIEF: Sliders,
    STORE_MGR: Activity,
    BRANCH_MGR: Shield,
    PROC_MGR: Fingerprint
};

const isUserRole = (id: string): id is UserRole => {
    return id in PERMISSION_MATRIX;
};

export function RolesViewerClient() {
    const t = useTranslations('admin');
    const tCommon = useTranslations('common');
    const tSidebar = useTranslations('common.sidebar');
    const locale = useLocale();
    const isRtl = locale === 'ar';

    const shadowClass = isRtl
        ? 'shadow-[-4px_0_12px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_12px_rgba(0,0,0,0.2)]'
        : 'shadow-[4px_0_12px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_12px_rgba(0,0,0,0.2)]';

    const { data: roles = [], isLoading } = useAdminRoles();
    const [hoveredCell, setHoveredCell] = useState<{ resource: ResourceType; role: string; action: ActionType } | null>(null);
    useUnsavedChangesGuard(false);

    const getRoleDisplayName = (roleId: string) => {
        const translationKey = `matrix.role_names.${roleId}`;
        if (t.has(translationKey)) {
            return t(translationKey);
        }
        return roleId.replace(/_/g, ' ');
    };

    const getResourceDisplayName = (resource: ResourceType) => {
        if (tSidebar.has(resource)) {
            return tSidebar(resource);
        }
        const groupKey = `group_${resource}`;
        if (tSidebar.has(groupKey)) {
            return tSidebar(groupKey);
        }
        if (tCommon.has(resource)) {
            return tCommon(resource);
        }
        if (resource === 'master_data') {
            return tCommon('master_data') || 'البيانات الأساسية';
        }
        if (resource === 'admin') {
            return tSidebar('group_admin') || tCommon('admins') || 'الإدارة';
        }
        if (resource === 'inventory') {
            return tCommon('inventory') || 'المخزون';
        }
        return resource.replace(/_/g, ' ').toUpperCase();
    };

    if (isLoading) {
        return (
            <MasterDataFormLayout
                title={t('roles_permissions')}
                backHref="/admin/roles"
                isSaving={false}
                onSubmit={() => { }}
                resource="admin"
                saveAction="view"
                hideSave={true}
            >
                <div className="w-full min-w-0 flex flex-col gap-6 p-6 bg-card border border-border rounded-xl mt-4 col-span-12 relative animate-pulse">
                    {/* Metrics skeletons */}
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-24 bg-surface-container-high/40 rounded-xl border border-border/50 flex flex-col justify-between p-5">
                                <Skeleton className="h-3.5 w-24 bg-surface-container-highest/60" />
                                <Skeleton className="h-6 w-12 bg-surface-container-highest/60" />
                            </div>
                        ))}
                    </div>

                    {/* Matrix board skeleton */}
                    <div className="w-full min-w-0 bg-card border border-border rounded-xl shadow-sm mt-8 flex flex-col relative overflow-hidden">
                        {/* Header Panel */}
                        <div className="w-full flex justify-between items-center p-6 border-b border-border/40">
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-10 h-10 rounded-xl bg-surface-container-highest/50" />
                                <div className="flex flex-col gap-2">
                                    <Skeleton className="h-4.5 w-36 bg-surface-container-highest/50" />
                                    <Skeleton className="h-3 w-48 bg-surface-container-highest/30" />
                                </div>
                            </div>
                            <Skeleton className="h-6 w-16 rounded-full bg-surface-container-highest/50" />
                        </div>

                        {/* Table Skeleton */}
                        <div className="w-full overflow-x-auto border-t border-border custom-scrollbar">
                            <table className="w-full min-w-[1200px] text-start border-collapse hidden xl:table">
                                <thead>
                                    <tr>
                                        <th className={cn("px-6 py-4 bg-muted/30 sticky start-0 z-20 border-e border-border", shadowClass)} rowSpan={2}>
                                            <Skeleton className="h-4 w-24 bg-surface-container-highest/50" />
                                        </th>
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <th key={i} colSpan={6} className="px-4 py-3 border-b border-border bg-muted/30 border-e-2 border-border last:border-e-0">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Skeleton className="h-4 w-4 rounded-full bg-surface-container-highest/50" />
                                                    <Skeleton className="h-4 w-20 bg-surface-container-highest/50" />
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className="border-b border-border bg-muted/10">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            Array.from({ length: 6 }).map((_, j) => (
                                                <th key={`${i}-${j}`} className={cn("px-2 py-2 border-b border-border text-center", j === 5 ? "border-e-2 border-border" : "border-e border-border/40")}>
                                                    <Skeleton className="h-3 w-6 mx-auto bg-surface-container-highest/30" />
                                                </th>
                                            ))
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <tr key={i} className="h-12 border-b border-border">
                                            <td className={cn("px-6 py-4 bg-card sticky start-0 z-10 border-e border-border transition-colors", shadowClass)}>
                                                <Skeleton className="h-4 w-32 bg-surface-container-highest/40" />
                                            </td>
                                            {[1, 2, 3, 4, 5].map((j) => (
                                                Array.from({ length: 6 }).map((_, k) => (
                                                    <td key={`${j}-${k}`} className={cn("p-2 text-center", k === 5 ? "border-e-2 border-border" : "border-e border-border/40")}>
                                                        <Skeleton className="h-4 w-4 rounded-full mx-auto bg-surface-container-highest/20" />
                                                    </td>
                                                ))
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Card Skeleton */}
                    <Skeleton className="w-full h-20 rounded-xl bg-surface-container-high/40" />
                </div>
            </MasterDataFormLayout>
        );
    }

    return (
        <MasterDataFormLayout
            title={t('roles_permissions')}
            backHref="/admin/roles"
            isSaving={false}
            onSubmit={() => { }}
            resource="admin"
            saveAction="view"
            hideSave={true}
        >
            <div className="w-full min-w-0 flex flex-col gap-6 p-6 mt-4 col-span-12 relative">
                {/* Subtle decorative glow overlays */}
                <div className="absolute top-10 left-1/3 w-80 h-80 bg-operational-cyan/5 rounded-full blur-[100px] pointer-events-none -z-10" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-muted/50 rounded-full blur-[120px] pointer-events-none -z-10" />

                {/* Metrics bento-style cards row */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
                    <MetricCard
                        label={t('matrix.registered_roles')}
                        value={roles.length}
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

                {/* Main Matrix Board Card Container */}
                <div className="w-full min-w-0 bg-card border border-border rounded-xl shadow-sm mt-8 flex flex-col relative group/matrix overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-operational-cyan/[0.03] via-transparent to-emerald-500/[0.02] pointer-events-none" />

                    {/* Dashboard Header Panel */}
                    <div className="w-full flex flex-col sm:flex-row flex-wrap md:flex-nowrap justify-between items-start sm:items-center gap-4 min-w-0 p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-operational-cyan/10 rounded-xl border border-operational-cyan/20">
                                <Fingerprint className="w-5 h-5 text-operational-cyan animate-pulse" />
                            </div>
                            <div className="text-start">
                                <h3 className="text-lg font-bold text-foreground uppercase tracking-widest">
                                    {t('matrix.auth_matrix')}
                                </h3>
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-1">
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
                    <div className="w-full overflow-x-auto border-t border-border custom-scrollbar">
                        <table className="w-full min-w-[1200px] text-start border-collapse hidden xl:table">
                            <thead>
                                <tr>
                                    <th className={cn("px-6 py-4 text-sm font-bold text-foreground text-start bg-muted/30 sticky start-0 z-20 border-e border-border", shadowClass)} rowSpan={2}>
                                        {t('matrix.resource')}
                                    </th>
                                    {roles.map((role) => {
                                        const RoleIconComponent = (isUserRole(role.id) && ROLE_ICONS[role.id]) || ShieldCheck;
                                        const isRoleHovered = hoveredCell?.role === role.id;
                                        return (
                                            <th
                                                key={role.id}
                                                colSpan={ACTIONS.length}
                                                className="px-4 py-3 text-sm font-bold text-foreground text-center border-b border-border bg-muted/30 whitespace-nowrap border-e-2 border-border last:border-e-0"
                                            >
                                                <div className="flex items-center justify-center gap-2">
                                                    <RoleIconComponent className={cn("w-4 h-4 transition-transform duration-300", isRoleHovered ? "scale-110 text-operational-cyan" : "text-muted-foreground/40")} />
                                                    <span className="text-xs font-black uppercase tracking-wider">{getRoleDisplayName(role.id)}</span>
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                                <tr className="border-b border-border bg-muted/10">
                                    {roles.map((role) => (
                                        ACTIONS.map((action, actionIndex) => {
                                            const isActionHovered = hoveredCell?.role === role.id && hoveredCell?.action === action;
                                            const isLastAction = actionIndex === ACTIONS.length - 1;
                                            return (
                                                <th
                                                    key={`${role.id}-${action}`}
                                                    className={cn(
                                                        "px-2 py-2 text-center border-b border-border",
                                                        isLastAction ? "border-e-2 border-border" : "border-e border-border/40",
                                                        isActionHovered && "bg-operational-cyan/10"
                                                    )}
                                                >
                                                    <span className="text-[10px] font-semibold text-muted-foreground mx-1">
                                                        {action.substring(0, 3).toUpperCase()}
                                                    </span>
                                                </th>
                                            );
                                        })
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-none">
                                {RESOURCES.map((resource, i) => {
                                    const isRowHovered = hoveredCell?.resource === resource;
                                    return (
                                        <tr
                                            key={resource}
                                            className="group transition-all duration-300 h-16 border-b border-border hover:bg-muted/10"
                                        >
                                            {/* Left sticky resource descriptor */}
                                            <td className={cn("px-6 py-4 text-sm font-medium text-foreground text-start bg-card sticky start-0 z-10 border-e border-border transition-colors group-hover:bg-muted/20", shadowClass)}>
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
                                                    {getResourceDisplayName(resource)}
                                                </span>
                                            </td>
                                            {roles.map((role) => (
                                                ACTIONS.map((action, actionIndex) => {
                                                    const allowed = isUserRole(role.id) && (PERMISSION_MATRIX[role.id]?.[resource] ?? []).includes(action);
                                                    const isCellHovered = hoveredCell?.resource === resource && hoveredCell?.role === role.id && hoveredCell?.action === action;
                                                    const isRowIntersected = hoveredCell?.resource === resource;
                                                    const isColIntersected = hoveredCell?.role === role.id && hoveredCell?.action === action;
                                                    const isLastAction = actionIndex === ACTIONS.length - 1;

                                                    return (
                                                        <td
                                                            key={`${role.id}-${resource}-${action}`}
                                                            className={cn(
                                                                "p-2 text-center h-12 transition-all duration-200 cursor-crosshair min-w-[60px]",
                                                                isLastAction ? "border-e-2 border-border" : "border-e border-border/40",
                                                                isCellHovered && "bg-operational-cyan/20 scale-105 shadow-[0_0_15px_rgba(34,211,238,0.2)] ring-1 ring-operational-cyan/30 z-10",
                                                                !isCellHovered && isRowIntersected && isColIntersected && "bg-operational-cyan/10",
                                                                !isCellHovered && isRowIntersected && !isColIntersected && "bg-operational-cyan/[0.02]",
                                                                !isCellHovered && !isRowIntersected && isColIntersected && "bg-operational-cyan/[0.04]"
                                                            )}
                                                            onMouseEnter={() => setHoveredCell({ resource, role: role.id, action })}
                                                            onMouseLeave={() => setHoveredCell(null)}
                                                        >
                                                            <div className="flex items-center justify-center">
                                                                {allowed ? (
                                                                    <motion.div
                                                                        whileHover={{ scale: 1.2 }}
                                                                        transition={{ type: 'spring', stiffness: 450, damping: 12 }}
                                                                        className={cn(
                                                                            "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300",
                                                                            isCellHovered ? "bg-muted/50 shadow-[0_0_10px_rgba(16,185,129,0.4)] border border-emerald-400/40" : "bg-muted/50 border border-emerald-500/5"
                                                                        )}
                                                                    >
                                                                        <Check className={cn("w-3.5 h-3.5 text-foreground stroke-[3px] transition-transform duration-300", isCellHovered ? "scale-110" : "")} />
                                                                    </motion.div>
                                                                ) : (
                                                                    <Minus className={cn("w-3 h-3 transition-colors duration-300", isCellHovered ? "text-operational-cyan/40 font-bold" : "text-muted-foreground/10")} />
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bottom Immutable Rules Info Card */}
                <div className="w-full flex flex-wrap md:flex-nowrap items-center justify-center p-8 bg-card border border-border shadow-sm/30 backdrop-blur rounded-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-operational-cyan/[0.02] to-transparent pointer-events-none" />
                    <p className="text-[10px] font-bold text-muted-foreground/40 uppercase text-center leading-relaxed max-w-2xl tracking-[0.15em] relative z-10 group-hover:text-muted-foreground/60 transition-colors duration-500">
                        {t('matrix.immutable_note')}
                    </p>
                </div>
            </div>
        </MasterDataFormLayout>
    );
}
