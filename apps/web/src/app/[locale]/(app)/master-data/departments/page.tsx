import { DepartmentListClient } from './DepartmentListClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PageHeader } from '@/components/shared/PageHeader';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'master_data.departments' });
 return {
 title: `${t('title')} | LogiRest`,
 description: 'Organizational department and cost center management',
 };
}

export default async function DepartmentsPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations('master_data.departments');
 return (
 <ProtectedRoute requiredAction="view" requiredResource="master_data_departments">
 <div className="flex flex-col gap-6">
 <PageHeader 
 title={t('title')} 
 description={t('description')} />
 <DepartmentListClient locale={params.locale} />
 </div>
 </ProtectedRoute>
 );
}
