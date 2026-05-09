import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PageHeader } from '@/components/shared/PageHeader';
import { Link } from '@/i18n/navigation';
import { 
 Building2, 
 Warehouse, 
 Users2, 
 Truck, 
 Tags, 
 Package, 
 Scale, 
 Barcode, 
 Coins, 
 TrendingUp, 
 Upload 
} from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'masterData.common' });
 return {
 title: `${t('master_data')} | LogiRest`,
 };
}

export default async function MasterDataHubPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 const { locale } = params;
 setRequestLocale(locale);
 
 const t = await getTranslations('masterData');
 const commonT = await getTranslations('common');

 const modules = [
 { name: t('branches.title'), href: `/master-data/branches`, icon: Building2, resource: 'branches' },
 { name: t('warehouses.title'), href: `/master-data/warehouses`, icon: Warehouse, resource: 'warehouses' },
 { name: t('departments.title'), href: `/master-data/departments`, icon: Users2, resource: 'departments' },
 { name: t('suppliers.title'), href: `/master-data/suppliers`, icon: Truck, resource: 'suppliers' },
 { name: t('categories.title'), href: `/master-data/categories`, icon: Tags, resource: 'categories' },
 { name: t('items.title'), href: `/master-data/items`, icon: Package, resource: 'items' },
 { name: t('uom.title'), href: `/master-data/units-of-measure`, icon: Scale, resource: 'uom' },
 { name: t('barcodes.title'), href: `/master-data/barcodes`, icon: Barcode, resource: 'barcodes' },
 { name: t('currencies.title'), href: `/master-data/currencies`, icon: Coins, resource: 'currencies' },
 { name: t('currencies.fx_rates_title'), href: `/master-data/currencies`, icon: TrendingUp, resource: 'currencies' },
 { name: t('import.title'), href: `/master-data/import`, icon: Upload, resource: 'import' },
 ];

 return (
 <ProtectedRoute requiredAction="view" requiredResource="master_data">
 <div className="flex flex-col gap-8">
 <PageHeader 
 title={t('common.master_data')} 
 description={commonT('master_data')}
 />

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
 {modules.map((module) => (
 <Link
 key={module.href + module.name}
 href={module.href}
 className="flex items-center gap-4 p-6 bg-surface-container-low rounded-lg transition-all hover:bg-surface-container-high group"
 >
 <div className="p-3 rounded-md bg-surface-container-high group-hover:bg-status-active/10 transition-colors">
 <module.icon className="w-6 h-6 text-muted-foreground/60 group-hover:text-status-active transition-colors" />
 </div>
 <div className="flex flex-col">
 <span className="font-semibold text-foreground group-hover:text-status-active transition-colors">
 {module.name}
 </span>
 <span className="text-label-xs text-muted-foreground/40 uppercase font-medium">
 {module.resource.replace('_', ' ')}
 </span>
 </div>
 </Link>
 ))}
 </div>
 </div>
 </ProtectedRoute>
 );
}
