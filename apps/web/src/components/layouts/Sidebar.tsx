'use client';
import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { usePermission, checkPermission } from '@/hooks/usePermission';
import { useAuth, type AuthUser } from '@/providers/AuthProvider';
import { PERMISSION_MATRIX, type ResourceType } from '@/types/rbac';
import { getRoleCategory, canViewFinancialData, isKitchenChief } from '@/utils/roleUtils';
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
 financialOnly?: boolean;
 /** If true, hidden from KITCHEN_CHIEF (department-scoped role). */
 warehouseOnly?: boolean;
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

 if (item.key === 'dashboard') {
  return true;
 }

 // FX rates and other financial items are restricted to roles with financial visibility
 if (item.key === 'fx_rates' && !canViewFinancialData(user.role)) {
  return false;
 }

 if (item.financialOnly && !canViewFinancialData(user.role)) {
  return false;
 }

 // Warehouse-only items are hidden from department-scoped kitchen staff
 if (item.warehouseOnly && isKitchenChief(user.role)) {
  return false;
 }

 // Admin / Settings: Show ONLY to ADMIN
 if (item.resource === 'admin' && user.role !== 'ADMIN') {
  return false;
 }

 // Explicitly gate Settings links to ADMIN role
 if ((item.key === 'settings' || item.key === 'mail_settings') && user.role !== 'ADMIN') {
  return false;
 }

 // Operations & Inventory: Hide from PROC_OFFICER, PROC_MGR, APPROVER, VIEWER
 const opsRestrictedRoles = ['PROC_OFFICER', 'PROC_MGR', 'APPROVER', 'VIEWER'];
 const opsResources = [
  'inventory_balance', 'inventory_lots', 'inventory_movements', 
  'grn', 'issue', 'transfer', 'stocktake', 'adjustment', 
  'kitchen_requests', 'inventory'
 ];
 if (opsResources.includes(item.resource) && opsRestrictedRoles.includes(user.role)) {
  return false;
 }

 // Procurement: Show to ADMIN, PROC_OFFICER, PROC_MGR, INV_MGR, APPROVER, BRANCH_MGR
 const procAllowedRoles = ['ADMIN', 'PROC_OFFICER', 'PROC_MGR', 'INV_MGR', 'APPROVER', 'BRANCH_MGR'];
 if ((item.resource === 'pr' || item.resource === 'po') && !procAllowedRoles.includes(user.role)) {
  return false;
 }

 return checkPermission(user.role, 'view', item.resource);
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
    { key: 'balance', href: '/inventory/balance', resource: 'inventory_balance', labelKey: 'balance', icon: Layers },
    { key: 'lots', href: '/inventory/lots', resource: 'inventory_lots', labelKey: 'lots', icon: Package, warehouseOnly: true },
    { key: 'movements', href: '/inventory/movements', resource: 'inventory_movements', labelKey: 'movements', icon: History, warehouseOnly: true },
    { key: 'grn', href: '/goods-received', resource: 'grn', labelKey: 'grn', icon: Truck, warehouseOnly: true },
    { key: 'issue', href: '/issues', resource: 'issue', labelKey: 'issue', icon: ClipboardList, warehouseOnly: true },
    { key: 'transfer', href: '/transfers', resource: 'transfer', labelKey: 'transfer', icon: ArrowRightLeft, warehouseOnly: true },
    { key: 'stocktake', href: '/stocktake', resource: 'stocktake', labelKey: 'stocktake', icon: ClipboardCheck, warehouseOnly: true },
    { key: 'adjustment', href: '/adjustments', resource: 'adjustment', labelKey: 'adjustment', icon: Sliders, warehouseOnly: true },
    { key: 'kitchen_requests', href: '/kitchen-requests', resource: 'kitchen_requests', labelKey: 'kitchen_requests', icon: Store },
    { key: 'scan_mode', href: '/inventory/scan-mode', resource: 'inventory', labelKey: 'scan_mode', icon: Barcode, warehouseOnly: true },
    { key: 'expired_override', href: '/inventory/expired-override', resource: 'inventory', labelKey: 'expired_override', icon: ShieldCheck, warehouseOnly: true },
    // yield_management hidden for MVR launch — not in RFC scope
    { key: 'stocktake_archive', href: '/stocktake/archive', resource: 'stocktake', labelKey: 'stocktake_archive', icon: History, warehouseOnly: true },
    { key: 'transfer_hub', href: '/transfers/hub', resource: 'transfer', labelKey: 'transfer_hub', icon: LayoutDashboard, warehouseOnly: true },
   ]
  },
  {
   key: 'procurement',
   titleKey: 'group_procurement',
   items: [
    { key: 'pr', href: '/purchase-requests', resource: 'pr', labelKey: 'pr', icon: FileText },
    { key: 'po', href: '/purchase-orders', resource: 'po', labelKey: 'po', icon: ShoppingCart },
    // landed_cost hidden for MVR launch — Phase 2 feature requiring client onboarding
   ]
  },
  {
   key: 'communications',
   titleKey: 'group_communications',
   items: [
    { key: 'notifications', href: '/communications/notifications', resource: 'inventory', labelKey: 'notifications', icon: Bell },
    { key: 'templates', href: '/communications/notifications/templates', resource: 'admin', labelKey: 'templates', icon: FileText },
    { key: 'notification_settings', href: '/communications/notifications/settings', resource: 'admin', labelKey: 'notification_settings', icon: Bell },
    { key: 'email_outbox', href: '/communications/email-outbox', resource: 'admin', labelKey: 'email_outbox', icon: Mail },
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
    { key: 'barcode_mapping', href: '/master-data/barcodes/mapping', resource: 'barcode_mapping', labelKey: 'barcode_mapping', icon: Barcode },
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
    { key: 'report_available_inventory', href: '/reports/available-inventory', resource: 'reports', labelKey: 'report_available_inventory', icon: FileText },
    { key: 'report_currency_summaries', href: '/reports/currency-summaries', resource: 'reports', labelKey: 'report_currency_summaries', icon: FileText, financialOnly: true },
    { key: 'report_expiry', href: '/reports/expiry', resource: 'reports', labelKey: 'report_expiry', icon: FileText },
    { key: 'report_movements', href: '/reports/movements', resource: 'reports', labelKey: 'report_movements', icon: FileText },
    { key: 'report_procurement_status', href: '/reports/procurement-status', resource: 'reports', labelKey: 'report_procurement_status', icon: FileText, financialOnly: true },
    { key: 'report_wac_history', href: '/reports/wac-history', resource: 'reports', labelKey: 'report_wac_history', icon: TrendingUp, financialOnly: true },
    { key: 'report_stocktake_variance', href: '/reports/stocktake-variance', resource: 'reports', labelKey: 'report_stocktake_variance', icon: FileText },
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
    // frozen_items hidden for MVR — auto-freeze is disabled; this page has no operational value at launch
    { key: 'outbox', href: '/admin/outbox', resource: 'admin', labelKey: 'outbox', icon: Mail },
    { key: 'restaurant_profile', href: '/admin/restaurant-profile', resource: 'admin', labelKey: 'restaurant_profile', icon: Store },
    { key: 'audit', href: '/admin/audit-logs', resource: 'admin', labelKey: 'audit_log', icon: History },
   ]
  }
 ];

 if (isLoading) {
  return (
   <aside className="w-full bg-card border-e border-border flex flex-col h-full animate-pulse select-none pointer-events-none">
    <div className="p-4 flex items-center justify-between md:hidden mb-2">
     <span className="font-bold text-foreground">{tCommon('system.name')}</span>
    </div>
    <nav className="flex-1 py-4 flex flex-col gap-6 px-3">
     {[1, 2, 3].map((g) => (
      <div key={g} className="flex flex-col gap-2">
       <div className="h-3 w-16 bg-muted-foreground/10 rounded ms-4 mb-2" />
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
  <aside className="w-full bg-card border-e border-border flex flex-col h-full">
   <div className="p-4 flex items-center justify-between md:hidden mb-2">
    <span className="font-bold text-foreground">{tCommon('system.name')}</span>
    <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
     <X className="w-5 h-5 text-muted-foreground/60" />
    </button>
   </div>

   <nav className="flex-1 py-4 flex flex-col gap-6 px-3 overflow-y-auto custom-scrollbar">
    {groups.map((group) => {
     // Supply Chain group must not render if user lacks pr and po view access
     if (group.key === 'procurement') {
      const hasPrView = user ? checkPermission(user.role, 'view', 'pr') : false;
      const hasPoView = user ? checkPermission(user.role, 'view', 'po') : false;
      if (!hasPrView && !hasPoView) return null;
     }

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
 
 if (!isLoading && user) {
  if (item.key === 'fx_rates' && !canViewFinancialData(user.role)) {
   return null;
  }
  if (item.financialOnly && !canViewFinancialData(user.role)) {
   return null;
  }
  if (item.warehouseOnly && isKitchenChief(user.role)) {
   return null;
  }
 }
 
 if (item.key !== 'dashboard' && !canView) return null;
 
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
    "flex items-center gap-3 px-6 py-3 rounded-xl text-body-md md:text-body-lg font-bold uppercase transition-colors relative overflow-hidden",
    isActive
     ? "bg-muted border-e-4 border-primary text-primary"
     : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
