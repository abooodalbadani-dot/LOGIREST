'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePermission } from '@/hooks/usePermission';
import type { ResourceType } from '@/types/rbac';

interface NavItem {
  key: string;
  href: string;
  resource: ResourceType;
  labelKey: string;
}

export function Sidebar({ locale }: { locale: string }) {
  const pathname = usePathname();
  const t = useTranslations('common.sidebar');

  const items: NavItem[] = [
    { key: 'dashboard', href: `/${locale}/dashboard`, resource: 'inventory', labelKey: 'dashboard' },
    { key: 'grn', href: `/${locale}/goods-received`, resource: 'grn', labelKey: 'goods_received' },
    { key: 'issue', href: `/${locale}/issues`, resource: 'issue', labelKey: 'issues' },
    { key: 'transfer', href: `/${locale}/transfers`, resource: 'transfer', labelKey: 'transfers' },
    { key: 'pr', href: `/${locale}/purchase-requests`, resource: 'pr', labelKey: 'purchase_requests' },
    { key: 'po', href: `/${locale}/purchase-orders`, resource: 'po', labelKey: 'purchase_orders' },
    { key: 'stocktake', href: `/${locale}/stocktake`, resource: 'stocktake', labelKey: 'stocktake' },
    { key: 'adjustment', href: `/${locale}/adjustments`, resource: 'adjustment', labelKey: 'adjustments' },
    { key: 'balance', href: `/${locale}/inventory/balance`, resource: 'inventory', labelKey: 'inventory_balance' },
    { key: 'master', href: `/${locale}/master-data/branches`, resource: 'master_data', labelKey: 'master_data' },
    { key: 'reports', href: `/${locale}/reports`, resource: 'reports', labelKey: 'reports' },
    { key: 'admin', href: `/${locale}/admin/users`, resource: 'admin', labelKey: 'admin' },
  ];

  return (
    <aside className="w-64 bg-surface-1 border-e border-surface-3 flex flex-col h-full overflow-y-auto">
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
        {items.map((item) => (
          <SidebarLink key={item.key} item={item} pathname={pathname} t={t} />
        ))}
      </nav>
    </aside>
  );
}

function SidebarLink({ item, pathname, t }: { item: NavItem, pathname: string, t: any }) {
  const canView = usePermission('view', item.resource);
  
  if (!canView) return null;
  const isActive = pathname.startsWith(item.href);
  
  return (
    <Link 
      href={item.href}
      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
        isActive 
          ? 'bg-surface-3 text-neon-cyan' 
          : 'text-on-surface-muted hover:bg-surface-2 hover:text-on-surface'
      }`}
    >
      {t(item.labelKey) ?? item.labelKey}
    </Link>
  );
}
