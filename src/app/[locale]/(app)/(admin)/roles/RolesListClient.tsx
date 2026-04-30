'use client';
import { useTranslations } from 'next-intl';
import { useAdminRoles } from '@/features/admin/hooks/useAdminRoles';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, Shield, Users } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export function RolesListClient({ locale }: { locale: string }) {
  const t = useTranslations('admin.roles');
  const { data: roles, isLoading } = useAdminRoles();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
          <Shield className="w-8 h-8 text-cyan-500" />
          {t('roles_title')}
        </h1>
        <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.2em] font-bold">
          {t('roles_description')}
        </p>
      </div>

      <div className="bg-surface-container-low border border-outline-low rounded-sm overflow-hidden shadow-2xl shadow-black/40">
        <Table>
          <TableHeader className="bg-surface-container-highest/20">
            <TableRow className="border-outline-low hover:bg-transparent">
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-8">{t('role_name')}</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-8">{t('description')}</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-8 text-center">{t('users_count')}</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-8 text-end"></TableHead>
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
                      <span className="text-sm font-black uppercase tracking-tight text-foreground group-hover:text-cyan-500 transition-colors">
                        {role.id}
                      </span>
                      <span className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">
                        System Identifier: {role.id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-8 px-8">
                    <span className="text-xs text-muted-foreground font-medium leading-relaxed max-w-md block">
                      {role.description}
                    </span>
                  </TableCell>
                  <TableCell className="py-8 px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/5 border border-cyan-500/10">
                      <Users className="w-3 h-3 text-cyan-500/50" />
                      <span className="text-xs font-black text-cyan-500">{role.users_count}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-8 px-8 text-end">
                    <Button
                      asChild
                      variant="ghost"
                      className="h-10 px-6 rounded-sm bg-surface-container-highest/20 border border-outline-low hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition-all font-black uppercase tracking-widest text-[10px] gap-2 shadow-none"
                    >
                      <Link href={`/${locale}/admin/roles/${role.id}`}>
                        <Eye className="w-3.5 h-3.5" />
                        {t('view_detail')}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-3 p-6 bg-cyan-500/5 border border-cyan-500/10 rounded-sm">
        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/70">
          RBAC Propagation: Live system role registry active. Changes will affect associated account streams.
        </p>
      </div>
    </div>
  );
}
