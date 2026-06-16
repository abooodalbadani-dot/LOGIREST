import { BranchFormClient } from '../../BranchFormClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'master_data.branches' });
 return {
 title: `${t('edit_title')} | Otantik مطاعم`,
 };
}

export default async function EditBranchPage(props: { params: Promise<{ locale: string, id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations({ locale: params.locale, namespace: 'master_data.branches' });

 return (
  <ProtectedRoute requiredAction="edit" requiredResource="master_data_branches">
   <BranchFormClient 
    id={params.id} 
    locale={params.locale} 
    createTitle={t('create_title')} 
    editTitle={t('edit_title')} 
    viewTitle={t('view_title')}
    isReadOnly={false}
   />
  </ProtectedRoute>
 );
}
