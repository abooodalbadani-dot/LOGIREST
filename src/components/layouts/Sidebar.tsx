'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePermission } from '@/hooks/usePermission';
import type { ResourceType } from '@/types/rbac';
import { X } from 'lucide-react';

interface NavItem {
  key: string;
  href: string;
  resource: ResourceType;
  labelKey: string;
}

interface SidebarProps {
  locale: string;
  onClose?: () => void;
}

export function Sidebar({ locale, onClose }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('common.sidebar');

  const items: NavItem[] = [
    { key: 'dashboard', href: `/${locale}/dashboard`, resource: 'inventory', labelKey: 'dashboard' },
    { key: 'grn', href: `/${locale}/goods-received`, resource: 'grn', labelKey: 'grn' },
    { key: 'issue', href: `/${locale}/issues`, resource: 'issue', labelKey: 'issue' },
    { key: 'transfer', href: `/${locale}/transfers`, resource: 'transfer', labelKey: 'transfer' },
    { key: 'pr', href: `/${locale}/purchase-requests`, resource: 'pr', labelKey: 'pr' },
    { key: 'po', href: `/${locale}/purchase-orders`, resource: 'po', labelKey: 'po' },
    { key: 'stocktake', href: `/${locale}/stocktake`, resource: 'stocktake', labelKey: 'stocktake' },
    { key: 'adjustment', href: `/${locale}/adjustments`, resource: 'adjustment', labelKey: 'adjustment' },
    { key: 'balance', href: `/${locale}/inventory/balance`, resource: 'inventory', labelKey: 'balance' },
    { key: 'master', href: `/${locale}/master-data/branches`, resource: 'master_data', labelKey: 'master' },
    { key: 'reports', href: `/${locale}/reports`, resource: 'reports', labelKey: 'reports' },
    { key: 'admin', href: `/${locale}/admin/users`, resource: 'admin', labelKey: 'admin' },
  ];

  return (
    <aside className="w-full bg-surface-container-low flex flex-col h-full border-e border-white/10-muted/50">
      <div className="p-4 flex items-center justify-between md:hidden border-b border-white/10-muted/50 mb-2">
        <span className="font-bold text-operational-cyan">LogiRest</span>
        <button onClick={onClose} className="p-1 hover:bg-surface-container-high rounded-md">
          <X className="w-5 h-5 text-muted-foreground/60" />
        </button>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto">
        {items.map((item) => (
          <SidebarLink key={item.key} item={item} pathname={pathname} t={t} onClick={onClose} />
        ))}
      </nav>
    </aside>
  );
}

function SidebarLink({ item, pathname, t, onClick }: { item: NavItem, pathname: string, t: (key: string) => string, onClick?: () => void }) {
  const canView = usePermission('view', item.resource);
  
  if (!canView) return null;
  const isActive = pathname.startsWith(item.href);
  
  return (
    <Link 
      href={item.href}
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-3 ${
        isActive 
          ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(var(--primary-rgb),0.1)]' 
          : 'text-muted-foreground/60 hover:bg-surface-container-high hover:text-foreground'
      }`}
    >
      {t(item.labelKey) ?? item.labelKey}
    </Link>
  );
}
