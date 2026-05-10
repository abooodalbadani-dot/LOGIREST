import { WarehouseListClient } from './WarehouseListClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PageHeader } from '@/components/shared/PageHeader';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'master_data.warehouses' });
 return {
 title: `${t('title')} | LogiRest`,
 description: t('description'),
 };
}

export default async function WarehousesPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations('master_data.warehouses');
 
 return (
 <ProtectedRoute requiredAction="view" requiredResource="master_data">
 <WarehouseListClient locale={params.locale} />
 </ProtectedRoute>
 );
}
