'use client';

import { useOperationalScope } from '@/hooks/useOperationalScope';
import { useAuth } from '@/providers/AuthProvider';
import { useTranslations } from 'next-intl';
import { ShieldOff } from 'lucide-react';

interface ScopeGuardProps {
  warehouseId: string | undefined | null;
  children: React.ReactNode;
}

const SCOPELESS_ROLES: string[] = ['ADMIN', 'GM', 'INV_MGR', 'AUDITOR', 'VIEWER'];

export function ScopeGuard({ warehouseId, children }: ScopeGuardProps) {
  const { user } = useAuth();
  const { warehouseId: activeWarehouseId } = useOperationalScope();
  const t = useTranslations('common');

  if (!warehouseId) {
    return <>{children}</>;
  }

  if (SCOPELESS_ROLES.includes(user?.role ?? '')) {
    return <>{children}</>;
  }

  if (!activeWarehouseId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8">
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <ShieldOff className="w-10 h-10 text-amber-500" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h3 className="text-headline-md font-semibold text-foreground">
            {t('scope_empty')}
          </h3>
          <p className="text-label-sm text-muted-foreground max-w-md text-center">
            {t('scope_empty')}
          </p>
        </div>
      </div>
    );
  }

  if (activeWarehouseId !== warehouseId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8">
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20">
          <ShieldOff className="w-10 h-10 text-red-500" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h3 className="text-headline-md font-semibold text-foreground">
            {t('scope_access_denied')}
          </h3>
          <p className="text-label-sm text-muted-foreground max-w-md text-center">
            {t('scope_access_denied_description')}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}