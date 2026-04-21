'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { useAdminUsers, type AdminUserRow } from '@/features/admin/hooks/useAdminUsers';

const roleColors: Record<string, string> = {
  ADMIN: 'bg-neon-red/20 text-neon-red',
  INV_MGR: 'bg-neon-cyan/20 text-neon-cyan',
  WH_KEEPER: 'bg-neon-amber/20 text-neon-amber',
  PROC_OFFICER: 'bg-blue-900/40 text-blue-300',
  AUDITOR: 'bg-surface-3 text-on-surface-muted',
};

export function UserListClient() {
  const t = useTranslations('admin');
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminUsers({ page });

  const columns: any[] = [
    {
      accessorKey: 'name',
      header: t('name'),
      cell: (row: AdminUserRow) => row.name,
    },
    {
      accessorKey: 'email',
      header: t('email'),
      cell: (row: AdminUserRow) => <span dir="ltr">{row.email}</span>,
    },
    {
      accessorKey: 'role',
      header: t('role'),
      cell: (row: AdminUserRow) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleColors[row.role] ?? 'bg-surface-3 text-on-surface-muted'}`}>
          {row.role}
        </span>
      ),
    },
    {
      accessorKey: 'scopes',
      header: t('scopes'),
      cell: (row: AdminUserRow) => {
        const scopeLabels: string[] = [];
        row.scopes.forEach((s) => {
          const parts: string[] = [];
          if (s.branch_id) parts.push(`B:${s.branch_id}`);
          if (s.warehouse_id) parts.push(`W:${s.warehouse_id}`);
          if (s.department_id) parts.push(`D:${s.department_id}`);
          if (parts.length) scopeLabels.push(parts.join(', '));
        });
        return <span dir="ltr" className="text-sm text-on-surface-muted">{scopeLabels.join(' | ') || '—'}</span>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link href="users/new" className={buttonVariants({ variant: 'default' })}>
          <Plus className="w-4 h-4 me-2" />
          {t('create_user')}
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={(row: AdminUserRow) => router.push(`users/${row.id}`)}
      />

      {data?.meta && data.meta.total_pages > 1 && (
        <Pagination page={page} totalPages={data.meta.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}