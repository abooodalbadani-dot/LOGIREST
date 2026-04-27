'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Shield, Users, ShieldAlert, Search } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useAdminUsers, type AdminUserRow } from '@/features/admin/hooks/useAdminUsers';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const roleVariants: Record<string, string> = {
  ADMIN: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  INV_MGR: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  APPROVER: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  WH_KEEPER: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PROC_OFFICER: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  AUDITOR: 'bg-white/5 text-white/40 border-white/10',
  VIEWER: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export function UserListClient({ locale }: { locale: string }) {
  const t = useTranslations('admin');
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

  const columns: ColumnDef<AdminUserRow, unknown>[] = [
    {
      accessorKey: 'name',
      header: t('name'),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-xs tracking-tight">{row.original.name}</span>
          <span className="text-[10px] opacity-40 font-mono tracking-tighter" dir="ltr">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: t('role'),
      cell: ({ row }) => (
        <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest rounded-sm ${roleVariants[row.original.role] ?? 'bg-white/5 text-white/40 border-white/10'}`}>
          {row.original.role}
        </Badge>
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
              <span key={idx} dir="ltr" className="text-[10px] font-mono opacity-60 bg-white/5 px-1.5 py-0.5 rounded-sm">
                {sl}
              </span>
            )) : <span className="opacity-20 text-[10px] italic">— No Scope —</span>}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[10px] font-black uppercase tracking-widest text-cyan-500 hover:text-cyan-500 hover:bg-cyan-500/10 h-7"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/${locale}/admin/users/${row.original.id}`);
            }}
          >
            {tCommon('view') || 'Inspect'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <PageHeader 
        title={t('title') || 'Access Management'} 
        description={t('description') || 'Authorized identity registry and operational scoping'}
        actions={
          <Link href={`/${locale}/admin/users/new`}>
            <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-sm transition-all shadow-lg shadow-cyan-900/20">
              <Plus className="w-3.5 h-3.5 mr-2" />
              {t('create_user')}
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Users className="w-24 h-24 text-white" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tCommon('total_users') || 'Identities'}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-foreground" dir="ltr">{stats.total}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-cyan-500/50 to-transparent" />
        </Card>

        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <ShieldAlert className="w-24 h-24 text-rose-400" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tCommon('admins') || 'Elevated Access'}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-rose-400" dir="ltr">{stats.admins}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-rose-500/50 to-transparent" />
        </Card>

        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Shield className="w-24 h-24 text-cyan-400" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tCommon('operators') || 'Standard Ops'}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-cyan-400" dir="ltr">{stats.ops}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-cyan-500/50 to-transparent" />
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        collectionName="admin_users"
        onRowClick={(row: AdminUserRow) => router.push(`/${locale}/admin/users/${row.id}`)}
        pagination={data?.meta ? {
          page: page,
          pageSize: 10,
          total: data.meta.total,
          totalPages: data.meta.total_pages,
          onPageChange: setPage
        } : undefined}
        filters={
          <div className="flex flex-wrap items-end gap-6 w-full py-4 px-6 bg-surface-container-low/50 border border-white/5 rounded-sm">
            <div className="flex flex-col gap-2 min-w-[300px] flex-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tCommon('search')}</label>
              <div className="relative">
                <Input
                  placeholder="Search identities by name or email..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full bg-surface-container-highest/30 border-none h-11 px-10 text-xs font-bold"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}