'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { UserX, ShieldCheck, Search, Shield, Users, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useAdminUsers, type AdminUserRow } from '@/features/admin/hooks/useAdminUsers';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MetricCard } from '@/components/ui/metric-card';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';

const roleVariants: Record<string, string> = {
 ADMIN: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
 INV_MGR: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
 APPROVER: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
 WH_KEEPER: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
 PROC_OFFICER: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
 AUDITOR: 'bg-surface-container text-muted-foreground border-border-surface',
 VIEWER: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export function UserListClient({ locale }: { locale: string }) {
 const t = useTranslations('admin.users');
 const tCommon = useTranslations('common');
 const router = useRouter();
 const [page, setPage] = useState(1);
 const [search, setSearch] = useState('');

 const { data, isLoading } = useAdminUsers({ page });

 const stats = useMemo(() => {
 const users = data?.data || [];
 return {
 total: data?.meta?.total || 0,
 admins: users.filter(u => u.role === 'ADMIN').length,
 ops: users.filter(u => u.role !== 'ADMIN').length,
 };
 }, [data]);

 const columns = useMemo<ColumnDef<AdminUserRow, unknown>[]>(() => [
 {
 accessorKey: 'name',
 header: t('name'),
 cell: ({ row }) => (
 <div className="flex flex-col gap-0.5">
 <span className="font-bold text-label-sm">{row.original.name}</span>
 <span className="text-label-xs opacity-40 font-mono" dir="ltr">{row.original.email}</span>
 </div>
 ),
 },
 {
 accessorKey: 'role',
 header: t('role'),
 cell: ({ row }) => (
 <Badge variant="outline" className={`text-label-xxs font-semibold uppercase rounded-sm ${roleVariants[row.original.role] ?? 'bg-surface-container text-muted-foreground border-border-surface'}`}>
 {row.original.role}
 </Badge>
 ),
 },
 {
 accessorKey: 'status',
 header: t('status'),
 cell: ({ row }) => (
 <StatusBadge status={row.original.status || 'ACTIVE'} className="rounded-sm px-2 h-5" />
 ),
 },
 {
 accessorKey: 'language',
 header: t('language'),
 cell: ({ row }) => (
 <span className="text-label-xs font-semibold uppercase opacity-60 px-2 py-0.5 bg-surface-container rounded-sm">
 {row.original.language || 'en'}
 </span>
 ),
 },
 {
 accessorKey: 'scopes',
 header: t('scopes'),
 cell: ({ row }) => {
 const scopeLabels: string[] = [];
 row.original.scopes.forEach((s) => {
 const parts: string[] = [];
 if (s.branch_id) parts.push(`B:${s.branch_id}`);
 if (s.warehouse_id) parts.push(`W:${s.warehouse_id}`);
 if (s.department_id) parts.push(`D:${s.department_id}`);
 if (parts.length) scopeLabels.push(parts.join(', '));
 });
 return (
 <div className="flex flex-wrap gap-1">
 {scopeLabels.length > 0 ? scopeLabels.map((sl, idx) => (
 <span key={idx} dir="ltr" className="text-label-xs font-mono opacity-60 bg-white/5 px-1.5 py-0.5 rounded-sm">
 {sl}
 </span>
 )) : <span className="opacity-20 text-label-xs italic">— No Scope —</span>}
 </div>
 );
 },
 },
 {
 accessorKey: 'created_at',
 header: tCommon('created_at'),
 cell: ({ row }) => (
 <span className="text-label-xs font-mono opacity-40" dir="ltr">
 {row.original.created_at ? format(new Date(row.original.created_at), 'yyyy-MM-dd HH:mm') : '—'}
 </span>
 ),
 },
 {
 id: 'actions',
 header: '',
 cell: ({ row }) => (
 <div className="flex justify-end">
 <Button 
 variant="ghost" 
 size="sm" 
 className="text-label-xs font-semibold uppercase text-cyan-500 hover:text-cyan-500 hover:bg-cyan-500/10 h-7"
 onClick={(e) => {
 e.stopPropagation();
 router.push(`/ ${locale}/admin/users/ ${row.original.id}`);
 }}
 >
 {tCommon('view')}
 </Button>
 </div>
 ),
 },
 ], [t, tCommon, router, locale]);

 return (
 <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
 <PageHeader 
 title={t('title') || 'Access Management'} description={t('description') || 'Authorized identity registry and operational scoping'} actions={
 <PermissionGate action="create" resource="admin">
 <Link href={`/ ${locale}/admin/users/new`}>
 <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-label-xs font-semibold uppercase rounded-sm transition-all shadow-lg shadow-cyan-900/20">
 <Plus className="w-3.5 h-3.5 me-2" />
 {t('create_user')}
 </Button>
 </Link>
 </PermissionGate>
 }
 />

 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 <MetricCard
 label={tCommon('total_users') || 'Total Identities'} value={stats.total}
 icon={Users}
 color="cyan"
 />
 <MetricCard
 label={tCommon('admins') || 'Elevated Access'} value={stats.admins}
 icon={ShieldCheck}
 color="rose"
 />
 <MetricCard
 label={tCommon('operators') || 'Standard Ops'} value={stats.ops}
 icon={Shield}
 color="cyan"
 />
 </div>

 <DataTable
 columns={columns}
 data={data?.data ?? []}
 isLoading={isLoading}
 collectionName="admin_users"
 onRowClick={(row: AdminUserRow) => router.push(`/ ${locale}/admin/users/ ${row.id}`)}
 pagination={data?.meta ? {
 page: page,
 pageSize: 10,
 total: data.meta.total,
 totalPages: data.meta.total_pages,
 onPageChange: setPage
 } : undefined}
 filters={
 <div className="flex flex-wrap items-end gap-6 w-full py-4 px-6 bg-surface-container-low/50 border border-border-surface rounded-sm">
 <div className="flex flex-col gap-2 min-w-[300px] flex-1">
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{tCommon('search')}</label>
 <div className="relative">
 <Input
 placeholder="Search identities by name or email..."
 value={search}
 onChange={(e) => { setSearch(e.target.value); setPage(1); }}
 className="w-full bg-surface-container-highest/30 border-none h-11 px-10 text-label-sm font-bold"
 />
 <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
 </div>
 </div>
 </div>
 }
 />
 </div>
 );
}
