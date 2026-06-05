'use client';
import { useTranslations } from 'next-intl';
import { useAdminRoles } from '@/features/admin/hooks/useAdminRoles';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, Users } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Edit2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ROLE_METADATA, type UserRole } from '@logirest/shared-types';

export function RolesListClient({ locale: _locale }: { locale: string }) {
  const t = useTranslations('admin.roles');
  const tCommon = useTranslations('common');
  const { data: roles, isLoading } = useAdminRoles();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      <div className="bg-surface-container-low border border-outline-low rounded-sm overflow-hidden shadow-2xl shadow-black/40">
        <Table>
          <TableHeader className="bg-surface-container-highest/20">
            <TableRow className="border-outline-low hover:bg-transparent">
              <TableHead className="text-label-xs font-semibold uppercase py-6 px-8">{t('role_name')}</TableHead>
              <TableHead className="text-label-xs font-semibold uppercase py-6 px-8">{t('description')}</TableHead>
              <TableHead className="text-label-xs font-semibold uppercase py-6 px-8 text-center">{t('users_count')}</TableHead>
              <TableHead className="text-label-xs font-semibold uppercase py-6 px-8 text-end"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="border-outline-low">
                  <TableCell className="p-8"><Skeleton className="h-4 w-32 bg-outline-low" /></TableCell>
                  <TableCell className="p-8"><Skeleton className="h-4 w-64 bg-outline-low" /></TableCell>
                  <TableCell className="p-8"><Skeleton className="h-4 w-8 mx-auto bg-outline-low" /></TableCell>
                  <TableCell className="p-8"><Skeleton className="h-8 w-24 ms-auto bg-outline-low" /></TableCell>
                </TableRow>
              ))
            ) : (
              roles?.map((role) => (
                <TableRow key={role.id} className="border-outline-low hover:bg-surface-container-highest/10 transition-colors group">
                  <TableCell className="py-8 px-8">
                    <div className="flex flex-col gap-1">
                      <span className="text-body-md font-semibold text-foreground group-hover:text-cyan-500 transition-colors">
                        {ROLE_METADATA[role.id as UserRole]?.displayName || role.name}
                      </span>
                      <span className="text-label-xs text-muted-foreground/40 font-bold uppercase">
                        System Identifier: {role.id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-8 px-8">
                    <span className="text-label-sm text-muted-foreground font-medium leading-relaxed max-w-md block">
                      {ROLE_METADATA[role.id as UserRole]?.description || role.description}
                    </span>
                  </TableCell>
                  <TableCell className="py-8 px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/5 border border-cyan-500/10">
                      <Users className="w-3 h-3 text-cyan-500/50" />
                      <span className="text-label-sm font-semibold text-cyan-500">{role.usersCount}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-8 px-8 text-end">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        asChild
                        variant="ghost"
                        className="h-10 px-4 rounded-sm bg-surface-container-highest/20 border border-outline-low hover:bg-surface-container-highest/40 transition-all font-semibold uppercase text-label-xs gap-2"
                      >
                        <Link href={`/admin/roles/${role.id}`}>
                          <Eye className="w-3.5 h-3.5" />
                          {t('view_detail')}
                        </Link>
                      </Button>

                      <PermissionGate action="edit" resource="admin">
                        <Button
                          asChild
                          variant="ghost"
                          className="h-10 px-4 rounded-sm bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition-all font-semibold uppercase text-label-xs gap-2"
                        >
                          <Link href={`/admin/roles/${role.id}/edit`}>
                            <Edit2 className="w-3.5 h-3.5" />
                            {tCommon('edit')}
                          </Link>
                        </Button>
                      </PermissionGate>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-3 p-6 bg-cyan-500/5 border border-cyan-500/10 rounded-sm">
        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
        <p className="text-label-xs font-semibold uppercase text-cyan-500/70">
          RBAC Propagation: Live system role registry active. Changes will affect associated account streams.
        </p>
      </div>
    </div>
  );
}
