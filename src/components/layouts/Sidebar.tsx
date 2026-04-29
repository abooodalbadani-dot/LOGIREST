'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePermission } from '@/hooks/usePermission';
import type { ResourceType } from '@/types/rbac';
import { 
  LayoutDashboard, 
  Truck, 
  ClipboardList, 
  ArrowRightLeft, 
  FileText, 
  ShoppingCart, 
  ClipboardCheck, 
  Sliders, 
  Layers, 
  Database, 
  BarChart3, 
  ShieldCheck,
  Bell,
  Mail,
  Shield,
  History,
  X,
  Package,
  Warehouse,
  Ruler,
  Barcode,
  Building2,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  key: string;
  href: string;
  resource: ResourceType;
  labelKey: string;
  icon: LucideIcon;
}

interface NavGroup {
  key: string;
  titleKey: string;
  items: NavItem[];
}

interface SidebarProps {
  locale: string;
  onClose?: () => void;
}

export function Sidebar({ locale, onClose }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('common.sidebar');

  const groups: NavGroup[] = [
    {
      key: 'dashboard',
      titleKey: 'group_dashboard',
      items: [
        { key: 'dashboard', href: `/${locale}/dashboard`, resource: 'inventory', labelKey: 'dashboard', icon: LayoutDashboard },
      ]
    },
    {
      key: 'inventory',
      titleKey: 'group_inventory',
      items: [
        { key: 'balance', href: `/${locale}/inventory/balance`, resource: 'inventory', labelKey: 'balance', icon: Layers },
        { key: 'grn', href: `/${locale}/goods-received`, resource: 'grn', labelKey: 'grn', icon: Truck },
        { key: 'issue', href: `/${locale}/issues`, resource: 'issue', labelKey: 'issue', icon: ClipboardList },
        { key: 'transfer', href: `/${locale}/transfers`, resource: 'transfer', labelKey: 'transfer', icon: ArrowRightLeft },
        { key: 'stocktake', href: `/${locale}/stocktake`, resource: 'stocktake', labelKey: 'stocktake', icon: ClipboardCheck },
        { key: 'adjustment', href: `/${locale}/adjustments`, resource: 'adjustment', labelKey: 'adjustment', icon: Sliders },
      ]
    },
    {
      key: 'procurement',
      titleKey: 'group_procurement',
      items: [
        { key: 'pr', href: `/${locale}/purchase-requests`, resource: 'pr', labelKey: 'pr', icon: FileText },
        { key: 'po', href: `/${locale}/purchase-orders`, resource: 'po', labelKey: 'po', icon: ShoppingCart },
      ]
    },
    {
      key: 'communications',
      titleKey: 'group_communications',
      items: [
        { key: 'notifications', href: `/${locale}/communications/notifications`, resource: 'inventory', labelKey: 'notifications', icon: Bell },
        { key: 'email_outbox', href: `/${locale}/communications/email-outbox`, resource: 'inventory', labelKey: 'email_outbox', icon: Mail },
      ]
    },
    {
      key: 'master_data',
      titleKey: 'group_master_data',
      items: [
        { key: 'items', href: `/${locale}/master-data/items`, resource: 'master_data', labelKey: 'items', icon: Package },
        { key: 'warehouses', href: `/${locale}/master-data/warehouses`, resource: 'master_data', labelKey: 'warehouses', icon: Warehouse },
        { key: 'uom', href: `/${locale}/master-data/units-of-measure`, resource: 'master_data', labelKey: 'uom', icon: Ruler },
        { key: 'barcodes', href: `/${locale}/master-data/barcodes`, resource: 'master_data', labelKey: 'barcodes', icon: Barcode },
        { key: 'branches', href: `/${locale}/master-data/branches`, resource: 'master_data', labelKey: 'branches', icon: Building2 },
      ]
    },
    {
      key: 'reports_group',
      titleKey: 'group_reports',
      items: [
        { key: 'reports', href: `/${locale}/reports`, resource: 'reports', labelKey: 'reports', icon: BarChart3 },
      ]
    },
    {
      key: 'admin',
      titleKey: 'group_admin',
      items: [
        { key: 'users', href: `/${locale}/admin/users`, resource: 'admin', labelKey: 'users', icon: ShieldCheck },
        { key: 'roles', href: `/${locale}/admin/roles`, resource: 'admin', labelKey: 'roles', icon: Shield },
        { key: 'audit', href: `/${locale}/admin/audit-log`, resource: 'admin', labelKey: 'audit_log', icon: History },
      ]
    }
  ];

  return (
    <aside className="w-full bg-surface-container-low flex flex-col h-full">
      <div className="p-4 flex items-center justify-between md:hidden mb-2">
        <span className="font-bold text-operational-cyan">LogiRest</span>
        <button onClick={onClose} className="p-1 hover:bg-surface-container-high rounded-lg transition-colors">
          <X className="w-5 h-5 text-muted-foreground/60" />
        </button>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-6 px-3 overflow-y-auto custom-scrollbar">
        {groups.map((group) => {
          const visibleItems = group.items.filter(item => {
            return true; 
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.key} className="flex flex-col gap-1">
              {group.titleKey && (
                <div className="px-4 mb-2">
                  <span className={cn("text-[9px] font-black uppercase text-muted-foreground/40", locale === 'ar' ? 'tracking-normal' : 'tracking-[0.2em]')}>
                    {t(group.titleKey)}
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <SidebarLink key={item.key} item={item} pathname={pathname} t={t} onClick={onClose} locale={locale} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function SidebarLink({ item, pathname, t, onClick, locale }: { item: NavItem, pathname: string, t: (key: string) => string, onClick?: () => void, locale: string }) {
  const canView = usePermission('view', item.resource);
  
  if (!canView) return null;
  
  const isDashboard = item.key === 'dashboard';
  const isActive = isDashboard 
    ? pathname === item.href 
    : pathname.startsWith(item.href);

  const Icon = item.icon;
  
  return (
    <Link 
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all duration-[140ms] ease-out relative overflow-hidden",
        locale === 'ar' ? "tracking-normal" : "tracking-widest",
        isActive
          ? "bg-primary text-white shadow-lg shadow-primary/20"
          : "text-muted-foreground/60 hover:text-foreground hover:bg-surface-container-high"
      )}
    >
      {/* Active Indicator Glow */}
      {isActive && (
        <div className="absolute inset-0 bg-primary/5 animate-pulse" />
      )}

      <Icon className={cn(
        "w-4 h-4 transition-transform duration-200 relative z-10",
        isActive ? 'scale-110' : 'group-hover:scale-110'
      )} />
      
      <span className="flex-1 truncate relative z-10">
        {t(item.labelKey) ?? item.labelKey}
      </span>

      {isActive && (
        <div className="w-1.5 h-1.5 rounded-full bg-primary relative z-10" />
      )}
    </Link>
  );
}

