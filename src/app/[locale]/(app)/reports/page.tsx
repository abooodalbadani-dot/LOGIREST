import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ReportsHubClient } from './ReportsHubClient';
import { PageHeader } from '@/components/shared/PageHeader';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'reports' });
 return {
 title: `${t('title')} | LogiRest`,
 description: t('description') || 'Business intelligence and operational analysis reports',
 };
}

export default async function ReportsPage(props: { params: Promise<{ locale: string }> }) {
 const { locale } = await props.params;
 setRequestLocale(locale);
 const t = await getTranslations('reports');

 return (
 <ProtectedRoute requiredAction="view" requiredResource="reports">
 <div className="flex flex-col gap-6">
 <PageHeader 
 title={t('title')} 
 description={t('description') || 'Business intelligence and operational analysis reports'} />
 <ReportsHubClient />
 </div>
 </ProtectedRoute>
 );
}