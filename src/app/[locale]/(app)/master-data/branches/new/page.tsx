import { BranchFormClient } from '../BranchFormClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'master_data.branches' });
 return {
 title: `${t('create_title')} | LogiRest`,
 };
}

export default async function NewBranchPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations({ locale: params.locale, namespace: 'master_data.branches' });

 return (
 <ProtectedRoute requiredAction="create" requiredResource="master_data_branches">
 <BranchFormClient 
 id={null} 
 locale={params.locale} 
 createTitle={t('create_title')} 
 editTitle={t('edit_title')} 
 />
 </ProtectedRoute>
 );
}
