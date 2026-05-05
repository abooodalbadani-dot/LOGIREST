import { CurrencyListClient } from './CurrencyListClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PageHeader } from '@/components/shared/PageHeader';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'master_data.currencies' });
 return {
 title: `${t('title')} | LogiRest`,
 description: 'Multi-currency support and exchange rate management',
 };
}

export default async function CurrenciesPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations('master_data.currencies');
 return (
 <ProtectedRoute requiredAction="view" requiredResource="master_data_currencies">
 <div className="flex flex-col gap-6">
 <PageHeader 
 title={t('title')} 
 description={t('description')} />
 <CurrencyListClient locale={params.locale} />
 </div>
 </ProtectedRoute>
 );
}
