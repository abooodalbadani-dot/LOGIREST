'use client';

import { useState, useMemo } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ShieldCheck, Search, Shield, Users, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useAdminUsers, type AdminUserRow } from '@/features/admin/hooks/useAdminUsers';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MetricCard } from '@/components/ui/metric-card';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';

const roleVariants: Record<string, string> = {
 ADMIN: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
 INV_MGR: 'bg-muted/50 text-foreground border-cyan-500/20',
 APPROVER: 'bg-muted/50 text-foreground border-emerald-500/20',
 WH_KEEPER: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
 PROC_OFFICER: 'bg-muted/50 text-foreground border-blue-500/20',
 AUDITOR: 'bg-surface-container text-muted-foreground border-border-surface',
 VIEWER: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export function UserListClient({ locale: _locale }: { locale: string }) {
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
    <div className="flex flex-col gap-0.5 min-w-0">
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
    const scopes = row.original.scopes || [];
    if (scopes.length === 0) return <span className="text-muted-foreground italic">— {t('no_scope')} —</span>;
    const firstScopeName = scopes[0].department?.name || scopes[0].warehouse?.name || scopes[0].branch?.name || 'Scope';
    return (
     <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="outline" className="truncate max-w-[200px]">{firstScopeName}</Badge>
      {scopes.length > 1 && <Badge variant="secondary" className="shrink-0">+{scopes.length - 1}</Badge>}
     </div>
    );
   },
  },
  {
   accessorKey: 'createdAt',
   header: tCommon('created_at'),
   cell: ({ row }) => (
    <span className="text-label-xs font-mono opacity-40" dir="ltr">
     {row.original.createdAt ? <ClientOnlyTime date={row.original.createdAt} mode="datetime" /> : '—'}
    </span>
   ),
  },
  {
   id: 'actions',
   header: '',
   cell: ({ row }) => (
    <div className="flex justify-end gap-3">
     <PermissionGate action="edit" resource="admin">
      <Button 
       variant="ghost" 
       size="sm" 
       className="text-label-xs font-bold uppercase text-operational-cyan hover:bg-operational-cyan/10 h-9 px-4 rounded-xl transition-all"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/admin/users/${row.original.id}/edit`);
       }}
      >
       <Edit className="w-3.5 h-3.5 me-2" />
       {tCommon('edit')}
      </Button>
     </PermissionGate>
     <Button 
      variant="ghost" 
      size="sm" 
      className="text-label-xs font-bold uppercase text-muted-foreground hover:text-foreground hover:bg-surface-container-highest/40 h-9 px-4 rounded-xl transition-all"
      onClick={(e) => {
       e.stopPropagation();
       router.push(`/admin/users/${row.original.id}`);
      }}
     >
      <Eye className="w-3.5 h-3.5 me-2" />
      {tCommon('view')}
     </Button>
    </div>
   ),
  },
 ], [t, tCommon, router]);

 return (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
   <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
    <MetricCard
     label={tCommon('total_users') || t('total_identities')}
     value={stats.total}
     icon={Users}
     color="cyan"
    />
    <MetricCard
     label={tCommon('admins') || t('elevated_access')}
     value={stats.admins}
     icon={ShieldCheck}
     color="rose"
    />
    <MetricCard
     label={tCommon('operators') || t('standard_ops')}
     value={stats.ops}
     icon={Shield}
     color="cyan"
    />
   </div>

   <DataTable
    columns={columns}
    data={data?.data ?? []}
    isLoading={isLoading}
    collectionName="admin_users"
    onRowClick={(row: AdminUserRow) => router.push(`/admin/users/${row.id}`)}
    pagination={data?.meta ? {
     page: page,
     pageSize: 10,
     total: data.meta.total,
     totalPages: data.meta.totalPages,
     onPageChange: setPage
    } : undefined}
    filters={
       <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
         <div className="w-full sm:max-w-md">
           <div className="relative w-full group">
             <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
             <Input
         placeholder={t('search_placeholder')}
         value={search}
         onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full ps-10 bg-background border border-border text-foreground focus:border-brand-gold shrink-0 rounded-lg transition-all"
        />
           </div>
         </div>
       </div>
      }
   />
  </div>
 );
}
