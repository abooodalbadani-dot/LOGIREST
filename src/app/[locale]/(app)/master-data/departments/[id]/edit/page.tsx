import { DepartmentFormClient } from '../../DepartmentFormClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'master_data.departments' });
 return {
 title: `${t('edit_title')} | LogiRest`,
 };
}

export default async function EditDepartmentPage(props: { params: Promise<{ locale: string; id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations({ locale: params.locale, namespace: 'master_data.departments' });

 return (
 <ProtectedRoute requiredAction="edit" requiredResource="master_data_departments">
 <DepartmentFormClient 
 id={params.id} 
 createTitle={t('create_title')} 
 editTitle={t('edit_title')} 
 />
 </ProtectedRoute>
 );
}
