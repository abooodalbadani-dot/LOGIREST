import { SupplierListClient } from './SupplierListClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PageHeader } from '@/components/shared/PageHeader';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'master_data.suppliers' });
 return {
 title: `${t('title')} | Otantik مطاعم`,
 description: 'Vendor and supplier relationship management',
 };
}

export default async function SuppliersPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations('master_data.suppliers');
 return (
 <ProtectedRoute requiredAction="view" requiredResource="master_data_suppliers">
 <div className="flex flex-col gap-6 min-w-0">
 <PageHeader 
 title={t('title')} 
 description={t('description')} />
 <SupplierListClient locale={params.locale} />
 </div>
 </ProtectedRoute>
 );
}
