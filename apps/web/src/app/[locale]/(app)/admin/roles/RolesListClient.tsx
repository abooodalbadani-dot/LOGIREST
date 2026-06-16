'use client';
import { useTranslations } from 'next-intl';
import { useAdminRoles } from '@/features/admin/hooks/useAdminRoles';
import { Button } from '@/components/ui/button';
import { Eye, Users, Edit2, KeyRound } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Skeleton } from '@/components/ui/skeleton';
import { ROLE_METADATA, type UserRole } from '@logirest/shared-types';
import { cn } from '@/lib/utils';

export function RolesListClient({ locale: _locale }: { locale: string }) {
 const t = useTranslations('admin.roles');
 const tCommon = useTranslations('common');
 const { data: roles, isLoading } = useAdminRoles();

 return (
  <div className="min-w-0 flex-1 flex-col flex w-full">
   <div className="w-full min-w-0 flex flex-col bg-card border border-border rounded-xl shadow-sm mt-4">
    {/* Header */}
    <div className="hidden lg:grid grid-cols-12 gap-6 px-6 py-4 border-b border-border bg-muted/40 text-sm font-bold text-foreground text-start">
     <div className="col-span-3">{t('role_name')}</div>
     <div className="col-span-5">{t('description')}</div>
     <div className="col-span-2 text-center">{t('users_count')}</div>
     <div className="col-span-2 text-end"></div>
    </div>
    
    {/* Body */}
    <div className="flex flex-col w-full">
     {isLoading ? (
      Array.from({ length: 6 }).map((_, i) => (
       <div key={i} className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-6 py-5 border-b border-border items-center w-full last:border-b-0">
        <div className="col-span-1 lg:col-span-3">
         <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl bg-muted" />
          <div className="flex flex-col gap-2">
           <Skeleton className="h-4 w-32 bg-muted" />
           <Skeleton className="h-3 w-20 bg-muted/50" />
          </div>
         </div>
        </div>
        <div className="col-span-1 lg:col-span-5">
         <Skeleton className="h-4 w-3/4 bg-muted/50" />
         <Skeleton className="h-4 w-1/2 mt-2 bg-muted/30" />
        </div>
        <div className="col-span-1 lg:col-span-2 flex justify-start lg:justify-center">
         <Skeleton className="h-7 w-16 rounded-full bg-muted/50" />
        </div>
        <div className="col-span-1 lg:col-span-2 flex justify-start lg:justify-end gap-2">
         <Skeleton className="h-9 w-24 bg-muted" />
         <Skeleton className="h-9 w-24 bg-muted" />
        </div>
       </div>
      ))
     ) : (
      roles?.map((role) => (
       <div key={role.id} className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-6 py-5 border-b border-border hover:bg-muted/50 transition-colors items-center w-full group last:border-b-0">
        <div className="col-span-1 lg:col-span-3 flex items-start gap-4 min-w-0">
         <div className="p-2.5 bg-muted rounded-xl border border-border group-hover:bg-cyan-500/10 group-hover:border-cyan-500/20 transition-colors shrink-0 mt-0.5">
          <KeyRound className="w-5 h-5 text-muted-foreground group-hover:text-cyan-500 transition-colors" />
         </div>
         <div className="flex flex-col gap-1.5 min-w-0 text-start">
          <span className="text-base font-bold text-foreground group-hover:text-cyan-500 transition-colors">
           {ROLE_METADATA[role.id as UserRole]?.displayName || role.name}
          </span>
          <span className="text-[10px] text-muted-foreground/80 font-black uppercase tracking-widest flex items-center gap-1.5 opacity-80">
           <span>SYSTEM ID:</span>
           <span dir="ltr" className="inline-block bg-muted/50 px-1.5 py-0.5 rounded text-foreground/70">{role.id}</span>
          </span>
         </div>
        </div>
        <div className="col-span-1 lg:col-span-5 text-start">
         <span className="text-sm text-muted-foreground font-medium leading-relaxed block max-w-2xl">
          {ROLE_METADATA[role.id as UserRole]?.description || role.description}
         </span>
        </div>
        <div className="col-span-1 lg:col-span-2 flex justify-start lg:justify-center">
         <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border group-hover:bg-cyan-500/10 group-hover:border-cyan-500/20 transition-colors">
          <Users className="w-3.5 h-3.5 text-muted-foreground group-hover:text-cyan-500 transition-colors" />
          <span className="text-xs font-bold text-foreground group-hover:text-cyan-500 transition-colors">{role.usersCount}</span>
         </div>
        </div>
        <div className="col-span-1 lg:col-span-2 flex justify-start lg:justify-end gap-2">
         <Button
          asChild
          variant="outline"
          className="h-9 px-4 bg-card border-border hover:bg-accent transition-all font-bold uppercase text-[10px] gap-2 tracking-wider"
         >
          <Link href={`/admin/roles/${role.id}`}>
           <Eye className="w-3.5 h-3.5 opacity-70" />
           {t('view_detail')}
          </Link>
         </Button>

         <PermissionGate action="edit" resource="admin">
          <Button
           asChild
           variant="default"
           className="h-9 px-4 bg-cyan-500 text-black hover:bg-cyan-400 transition-all font-bold uppercase text-[10px] gap-2 tracking-wider border-none shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]"
          >
           <Link href={`/admin/roles/${role.id}/edit`}>
            <Edit2 className="w-3.5 h-3.5" />
            {tCommon('edit')}
           </Link>
          </Button>
         </PermissionGate>
        </div>
       </div>
      ))
     )}
    </div>
   </div>

   <div className="flex items-center gap-3 p-5 bg-muted/30 border border-border rounded-xl mt-6 relative overflow-hidden group">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/[0.02] to-transparent pointer-events-none" />
    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)] relative z-10 shrink-0" />
    <p className="text-xs font-bold uppercase tracking-widest text-foreground/70 relative z-10 leading-relaxed">
     <span className="text-cyan-500 font-black">RBAC Propagation:</span> Live system role registry active. Changes will affect associated account streams.
    </p>
   </div>
  </div>
 );
}
