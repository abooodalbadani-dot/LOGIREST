import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ReportsHubClient } from './ReportsHubClient';
import { PageHeader } from '@/components/shared/PageHeader';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'reports' });
 return {
 title: `${t('title')} | Otantik مطاعم`,
 description: t('description'),
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
 description={t('description')} />
 <ReportsHubClient />
 </div>
 </ProtectedRoute>
 );
}
