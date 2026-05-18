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
  Package, 
  Warehouse, 
  Ruler, 
  Barcode, 
  Coins, 
  TrendingUp, 
  Building2, 
  BarChart3, 
  ShieldCheck, 
  Shield, 
  History, 
  Store,
  Bell,
  Mail,
  LucideIcon
} from 'lucide-react';
import { ResourceType } from '@/types/rbac';

export interface NavItem {
  key: string;
  href: string;
  resource: ResourceType;
  labelKey: string;
  icon: LucideIcon;
}

export interface NavGroup {
  key: string;
  titleKey: string;
  items: NavItem[];
}

export const navigationMap: NavGroup[] = [
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
      { key: 'grn', href: '/goods-received', resource: 'grn', labelKey: 'grn', icon: Truck },
      { key: 'issue', href: '/issues', resource: 'issue', labelKey: 'issue', icon: ClipboardList },
      { key: 'transfer', href: '/transfers', resource: 'transfer', labelKey: 'transfer', icon: ArrowRightLeft },
      { key: 'stocktake', href: '/stocktake', resource: 'stocktake', labelKey: 'stocktake', icon: ClipboardCheck },
      { key: 'adjustment', href: '/adjustments', resource: 'adjustment', labelKey: 'adjustment', icon: Sliders },
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
      { key: 'email_outbox', href: '/communications/email-outbox', resource: 'inventory', labelKey: 'email_outbox', icon: Mail },
    ]
  },
  {
    key: 'master_data',
    titleKey: 'group_master_data',
    items: [
      { key: 'items', href: '/master-data/items', resource: 'master_data', labelKey: 'items', icon: Package },
      { key: 'warehouses', href: '/master-data/warehouses', resource: 'master_data', labelKey: 'warehouses', icon: Warehouse },
      { key: 'uom', href: '/master-data/units-of-measure', resource: 'master_data', labelKey: 'uom', icon: Ruler },
      { key: 'barcodes', href: '/master-data/barcodes', resource: 'master_data', labelKey: 'barcodes', icon: Barcode },
      { key: 'currencies', href: '/master-data/currencies', resource: 'master_data', labelKey: 'currencies', icon: Coins },
      { key: 'fx_rates', href: '/master-data/fx-rates', resource: 'master_data_fx_rates', labelKey: 'fx_rates', icon: TrendingUp },
      { key: 'branches', href: '/master-data/branches', resource: 'master_data', labelKey: 'branches', icon: Building2 },
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
      { key: 'audit', href: '/admin/audit-logs', resource: 'admin', labelKey: 'audit_log', icon: History },
      { key: 'restaurant_profile', href: '/admin/restaurant-profile', resource: 'admin', labelKey: 'restaurant_profile', icon: Store },
    ]
  }
];
