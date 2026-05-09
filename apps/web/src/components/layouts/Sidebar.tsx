'use client';
import { Link, usePathname } from '@/i18n/navigation';
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
  Coins,
  TrendingUp,
  Store,
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
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('common.sidebar');

  const groups: NavGroup[] = [
    {
      key: 'dashboard',
      titleKey: 'group_dashboard',
      items: [
        { key: 'dashboard', href: '/dashboard', resource: 'inventory', labelKey: 'dashboard', icon: LayoutDashboard },
      ]
    },
    {
      key: 'inventory',
      titleKey: 'group_inventory',
      items: [
        { key: 'balance', href: '/inventory/balance', resource: 'inventory', labelKey: 'balance', icon: Layers },
        { key: 'lots', href: '/inventory/lots', resource: 'inventory_lots', labelKey: 'lots', icon: Package },
        { key: 'movements', href: '/inventory/movements', resource: 'inventory_movements', labelKey: 'movements', icon: History },
        { key: 'grn', href: '/goods-received', resource: 'grn', labelKey: 'grn', icon: Truck },
        { key: 'issue', href: '/issues', resource: 'issue', labelKey: 'issue', icon: ClipboardList },
        { key: 'transfer', href: '/transfers', resource: 'transfer', labelKey: 'transfer', icon: ArrowRightLeft },
        { key: 'stocktake', href: '/stocktake', resource: 'stocktake', labelKey: 'stocktake', icon: ClipboardCheck },
        { key: 'adjustment', href: '/adjustments', resource: 'adjustment', labelKey: 'adjustment', icon: Sliders },
        { key: 'kitchen_requests', href: '/kitchen-requests', resource: 'kitchen_requests', labelKey: 'kitchen_requests', icon: Store },
      ]
    },
    {
      key: 'procurement',
      titleKey: 'group_procurement',
      items: [
        { key: 'pr', href: '/purchase-requests', resource: 'pr', labelKey: 'pr', icon: FileText },
        { key: 'po', href: '/purchase-orders', resource: 'po', labelKey: 'po', icon: ShoppingCart },
      ]
    },
    {
      key: 'communications',
      titleKey: 'group_communications',
      items: [
        { key: 'notifications', href: '/communications/notifications', resource: 'inventory', labelKey: 'notifications', icon: Bell },
        { key: 'templates', href: '/communications/notifications/templates', resource: 'admin', labelKey: 'templates', icon: FileText },
        { key: 'email_outbox', href: '/communications/email-outbox', resource: 'inventory', labelKey: 'email_outbox', icon: Mail },
      ]
    },
    {
      key: 'master_data',
      titleKey: 'group_master_data',
      items: [
        { key: 'items', href: '/master-data/items', resource: 'master_data', labelKey: 'items', icon: Package },
        { key: 'categories', href: '/master-data/categories', resource: 'master_data_categories', labelKey: 'categories', icon: Layers },
        { key: 'warehouses', href: '/master-data/warehouses', resource: 'master_data', labelKey: 'warehouses', icon: Warehouse },
        { key: 'uom', href: '/master-data/units-of-measure', resource: 'master_data', labelKey: 'uom', icon: Ruler },
        { key: 'suppliers', href: '/master-data/suppliers', resource: 'master_data_suppliers', labelKey: 'suppliers', icon: Building2 },
        { key: 'departments', href: '/master-data/departments', resource: 'master_data_departments', labelKey: 'departments', icon: Building2 },
        { key: 'barcodes', href: '/master-data/barcodes', resource: 'master_data', labelKey: 'barcodes', icon: Barcode },
        { key: 'currencies', href: '/master-data/currencies', resource: 'master_data', labelKey: 'currencies', icon: Coins },
        { key: 'fx_rates', href: '/master-data/fx-rates', resource: 'master_data', labelKey: 'fx_rates', icon: TrendingUp },
        { key: 'branches', href: '/master-data/branches', resource: 'master_data', labelKey: 'branches', icon: Building2 },
        { key: 'import', href: '/master-data/import', resource: 'master_data', labelKey: 'import', icon: Database },
      ]
    },
    {
      key: 'reports_group',
      titleKey: 'group_reports',
      items: [
        { key: 'reports', href: '/reports', resource: 'reports', labelKey: 'reports', icon: BarChart3 },
      ]
    },
    {
      key: 'admin',
      titleKey: 'group_admin',
      items: [
        { key: 'users', href: '/admin/users', resource: 'admin', labelKey: 'users', icon: ShieldCheck },
        { key: 'roles', href: '/admin/roles', resource: 'admin', labelKey: 'roles', icon: Shield },
        { key: 'settings', href: '/admin/settings', resource: 'admin', labelKey: 'settings', icon: Sliders },
        { key: 'audit', href: '/admin/audit-logs', resource: 'admin', labelKey: 'audit_log', icon: History },
        { key: 'restaurant_profile', href: '/admin/restaurant-profile', resource: 'admin', labelKey: 'restaurant_profile', icon: Store },
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
                  <span className={cn("text-label-xs font-semibold uppercase text-muted-foreground/40", '')}>
                    {t(group.titleKey)}
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <SidebarLink key={item.key} item={item} pathname={pathname} t={t} onClick={onClose} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function SidebarLink({ item, pathname, t, onClick }: { item: NavItem, pathname: string, t: (key: string) => string, onClick?: () => void }) {
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
        "flex items-center gap-3 px-6 py-3 rounded-xl text-body-md md:text-body-lg font-bold uppercase transition-all duration-[140ms] ease-out relative overflow-hidden",
        isActive
          ? "bg-primary text-white shadow-xl shadow-primary/30"
          : "text-muted-foreground/50 hover:text-foreground hover:bg-surface-container-high"
      )}
    >
      {/* Active Indicator Glow */}
      {isActive && (
        <div className="absolute inset-0 bg-primary/5 animate-pulse" />
      )}

      <Icon className={cn(
        "w-4 h-4 transition-transform duration-200 relative z-10 shrink-0",
        isActive ? 'scale-110' : 'group-hover:scale-110'
      )} />
      
      <span className="flex-1 break-words whitespace-normal relative z-10 leading-tight">
        {t(item.labelKey) ?? item.labelKey}
      </span>

      {isActive && (
        <div className="w-1.5 h-1.5 rounded-full bg-primary relative z-10 shrink-0" />
      )}
    </Link>
  );
}
