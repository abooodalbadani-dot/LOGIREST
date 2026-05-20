'use client';
import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { usePermission } from '@/hooks/usePermission';
import { useAuth, type AuthUser } from '@/providers/AuthProvider';
import { PERMISSION_MATRIX, type ResourceType } from '@/types/rbac';
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

function checkItemVisibility(item: NavItem, user: AuthUser | null, isLoading: boolean): boolean {
  if (isLoading || !user) {
    return false;
  }

  const normalizedRole = user.role ? (
    user.role === 'ADMIN' ? 'admin' :
    user.role === 'AUDITOR' ? 'auditor' :
    ['GM', 'INV_MGR', 'STORE_MGR', 'PROC_OFFICER'].includes(user.role) ? 'manager' : 'clerk'
  ) : 'clerk';

  if (item.key === 'fx_rates' && normalizedRole === 'clerk') {
    return false;
  }

  const roleKey = user.role as keyof typeof PERMISSION_MATRIX;
  const allowed = PERMISSION_MATRIX[roleKey]?.[item.resource] ?? [];
  return allowed.includes('view');
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('common.sidebar');
  const tCommon = useTranslations('common');
  const { user, isLoading } = useAuth();

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
        { key: 'scan_mode', href: '/inventory/scan-mode', resource: 'inventory', labelKey: 'scan_mode', icon: Barcode },
        { key: 'expired_override', href: '/inventory/expired-override', resource: 'inventory', labelKey: 'expired_override', icon: ShieldCheck },
        { key: 'yield_management', href: '/yield-management', resource: 'inventory', labelKey: 'yield_management', icon: TrendingUp },
      ]
    },
    {
      key: 'procurement',
      titleKey: 'group_procurement',
      items: [
        { key: 'pr', href: '/purchase-requests', resource: 'pr', labelKey: 'pr', icon: FileText },
        { key: 'po', href: '/purchase-orders', resource: 'po', labelKey: 'po', icon: ShoppingCart },
        { key: 'landed_cost', href: '/landed-cost', resource: 'po', labelKey: 'landed_cost', icon: Coins },
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
        { key: 'fx_rates', href: '/master-data/fx-rates', resource: 'master_data_fx_rates', labelKey: 'fx_rates', icon: TrendingUp },
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
        { key: 'roles_matrix', href: '/admin/roles/matrix', resource: 'admin', labelKey: 'roles_matrix', icon: Shield },
        { key: 'settings', href: '/admin/settings', resource: 'admin', labelKey: 'settings', icon: Sliders },
        { key: 'mail_settings', href: '/admin/mail-settings', resource: 'admin', labelKey: 'mail_settings', icon: Sliders },
        { key: 'restaurant_profile', href: '/admin/restaurant-profile', resource: 'admin', labelKey: 'restaurant_profile', icon: Store },
        { key: 'audit', href: '/admin/audit-logs', resource: 'admin', labelKey: 'audit_log', icon: History },
      ]
    }
  ];

  if (isLoading) {
    return (
      <aside className="w-full bg-surface-container-low flex flex-col h-full animate-pulse select-none pointer-events-none">
        <div className="p-4 flex items-center justify-between md:hidden mb-2">
          <span className="font-bold text-muted-foreground/20">{tCommon('system.name')}</span>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-6 px-3">
          {[1, 2, 3].map((g) => (
            <div key={g} className="flex flex-col gap-2">
              <div className="h-3 w-16 bg-muted-foreground/10 rounded ml-4 mb-2" />
              {[1, 2].map((i) => (
                <div key={i} className="h-10 w-full bg-muted-foreground/10 rounded-xl" />
              ))}
            </div>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="w-full bg-surface-container-low flex flex-col h-full">
      <div className="p-4 flex items-center justify-between md:hidden mb-2">
        <span className="font-bold text-operational-cyan">{tCommon('system.name')}</span>
        <button onClick={onClose} className="p-1 hover:bg-surface-container-high rounded-lg transition-colors">
          <X className="w-5 h-5 text-muted-foreground/60" />
        </button>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-6 px-3 overflow-y-auto custom-scrollbar">
        {groups.map((group) => {
          const visibleItems = group.items.filter(item => {
            return checkItemVisibility(item, user, isLoading);
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
                {visibleItems.map((item) => (
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
  const { user, isLoading } = useAuth();
  
  if (!isLoading) {
    const normalizedRole = user?.role ? (
      user.role === 'ADMIN' ? 'admin' :
      user.role === 'AUDITOR' ? 'auditor' :
      ['GM', 'INV_MGR', 'STORE_MGR', 'PROC_OFFICER'].includes(user.role) ? 'manager' : 'clerk'
    ) : 'clerk';

    if (item.key === 'fx_rates' && normalizedRole === 'clerk') {
      return null;
    }
  }
  
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
