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
import { useDebounce } from '@/hooks/useDebounce';

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
 const debouncedSearch = useDebounce(search, 400);

 const { data, isLoading } = useAdminUsers({ page, search: debouncedSearch || undefined });

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
       className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
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

   <div className="flex-1 w-full min-h-[400px] md:min-h-0">
    <div className="hidden md:block w-full">
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

    {!isLoading && (data?.data ?? []).length > 0 && (
     <div className="flex flex-col gap-3 md:hidden mt-4">
      {(data?.data ?? []).map((user) => (
       <div 
        key={user.id} 
        className="bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 rounded-lg p-3 flex flex-col gap-2 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1A2234]/80 transition-colors"
        onClick={() => router.push(`/admin/users/${user.id}`)}
       >
        
        {/* TOP TIER: Identity */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1 w-full">
            {/* Name & Status Inline */}
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{user.name}</span>
              <StatusBadge status={user.status || 'ACTIVE'} className="px-1.5 py-0.5 text-[9px] rounded-md h-auto shrink-0" />
            </div>
            {/* Email Inline */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono font-bold text-gray-500 dark:text-gray-400 line-clamp-1" dir="ltr">{user.email}</span>
            </div>
            {/* Role & Scope */}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={`text-[9px] font-bold uppercase rounded-sm px-1.5 py-0.5 h-auto ${roleVariants[user.role] ?? 'bg-surface-container text-muted-foreground border-border-surface'}`}>
               {user.role}
              </Badge>
              {user.scopes && user.scopes.length > 0 && (
               <Badge variant="outline" className="text-[9px] font-bold uppercase px-1.5 py-0.5 h-auto max-w-[120px] truncate bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                {user.scopes[0].department?.name || user.scopes[0].warehouse?.name || user.scopes[0].branch?.name || 'Scope'}
                {user.scopes.length > 1 && ` +${user.scopes.length - 1}`}
               </Badge>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM TIER: Actions */}
        <div className="flex justify-end items-end pt-2 mt-1 border-t border-gray-100 dark:border-gray-800/50">
          <div className="flex gap-2 shrink-0">
           <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-4 flex items-center justify-center bg-gray-100 dark:bg-[#0B1220] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors uppercase"
            onClick={(e) => { e.stopPropagation(); router.push(`/admin/users/${user.id}`); }}
           >
            <Eye className="w-3.5 h-3.5 me-1.5" />
            {tCommon('view')}
           </Button>
           <PermissionGate action="edit" resource="admin">
            <Button 
             variant="ghost" 
             size="sm" 
             className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
             onClick={(e) => { e.stopPropagation(); router.push(`/admin/users/${user.id}/edit`); }}
            >
             <Edit className="w-3.5 h-3.5 me-1.5" />
             {tCommon('edit')}
            </Button>
           </PermissionGate>
          </div>
        </div>
       </div>
      ))}
     </div>
    )}
   </div>
  </div>
 );
}
