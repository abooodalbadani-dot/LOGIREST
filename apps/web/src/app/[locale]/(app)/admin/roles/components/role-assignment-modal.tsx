'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useUsers, useRoles, useUpdateUserRole } from '@/features/admin/hooks/use-roles';
import { ROLE_METADATA, type UserRole } from '@logirest/shared-types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Search, ArrowLeft, ArrowRight } from 'lucide-react';

interface Props {
  trigger?: React.ReactNode;
}

export function RoleAssignmentModal({ trigger }: Props) {
  const t = useTranslations('admin.roles');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>('');

  const limit = 10;
  const { data: usersData, isLoading: usersLoading } = useUsers(page, limit);
  const { data: roles } = useRoles();
  const updateMutation = useUpdateUserRole();

  const users = usersData?.data ?? [];
  const meta = usersData?.meta;

  const filteredUsers = search
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  const selectedUser = selectedUserId
    ? users.find((u) => u.id === selectedUserId)
    : null;

  const userRoles = roles ?? [];

  const handleConfirm = async () => {
    if (!selectedUserId || !newRole) return;
    await updateMutation.mutateAsync(
      { userId: selectedUserId, role: newRole },
      {
        onSuccess: () => {
          setOpen(false);
          setSelectedUserId(null);
          setNewRole('');
        },
      },
    );
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedUserId(null);
      setNewRole('');
      setPage(1);
      setSearch('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="h-11 px-8 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition-all font-semibold uppercase text-label-xs gap-2">
            <Shield className="w-4 h-4" />
            {t('assign_role')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('assign_role_title')}</DialogTitle>
          <DialogDescription>{t('assign_role_description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('search_users')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {selectedUser ? (
            <div className="space-y-4 p-4 bg-surface-container-low rounded-sm border border-outline-low">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body-md font-semibold">{selectedUser.name}</p>
                  <p className="text-label-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUserId(null)}
                  className="text-label-xs"
                >
                  {tCommon('change')}
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-label-xs text-muted-foreground font-semibold uppercase mb-1">
                    {t('current_role')}
                  </p>
                  <div className="px-3 py-2 bg-surface-container-highest/20 border border-outline-low rounded-sm text-label-sm font-semibold">
                    {ROLE_METADATA[selectedUser.role as UserRole]?.displayName ?? selectedUser.role}
                  </div>
                </div>

                <div className="flex items-center">
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>

                <div className="flex-1">
                  <p className="text-label-xs text-muted-foreground font-semibold uppercase mb-1">
                    {t('new_role')}
                  </p>
                  <Select value={newRole} onValueChange={(v) => v !== null && setNewRole(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_role')} />
                    </SelectTrigger>
                    <SelectContent>
                      {userRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {ROLE_METADATA[role.id as UserRole]?.displayName ?? role.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <>
              {usersLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full bg-outline-low" />
                  ))}
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto border border-outline-low rounded-sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-label-xs font-semibold uppercase py-3 px-4">
                          {tCommon('name')}
                        </TableHead>
                        <TableHead className="text-label-xs font-semibold uppercase py-3 px-4">
                          {tCommon('email')}
                        </TableHead>
                        <TableHead className="text-label-xs font-semibold uppercase py-3 px-4">
                          {tCommon('role')}
                        </TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow
                          key={user.id}
                          className="cursor-pointer hover:bg-surface-container-higher/20 transition-colors"
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setNewRole(user.role);
                          }}
                        >
                          <TableCell className="py-3 px-4 text-label-sm font-semibold">
                            {user.name}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-label-sm text-muted-foreground">
                            {user.email}
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-sm bg-surface-container-highest/20 border border-outline-low text-label-xs font-semibold">
                              {ROLE_METADATA[user.role as UserRole]?.displayName ?? user.role}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-end">
                            <Button variant="ghost" size="sm" className="text-label-xs">
                              {tCommon('select')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {meta && (
                <div className="flex items-center justify-between">
                  <p className="text-label-xs text-muted-foreground">
                    {tCommon('page_of', {
                      current: meta.page,
                      total: meta.totalPages,
                    })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {tCommon('cancel')}
          </DialogClose>
          <Button
            onClick={handleConfirm}
            disabled={!selectedUserId || !newRole || updateMutation.isPending}
          >
            {updateMutation.isPending ? tCommon('saving') : tCommon('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
