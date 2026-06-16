import { setRequestLocale, getTranslations } from 'next-intl/server';
import { BranchFormClient } from '../BranchFormClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'master_data.branches' });
 return {
  title: `${t('view_title')} | Otantik مطاعم`,
 };
}

export default async function BranchDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations({ locale: params.locale, namespace: 'master_data.branches' });

 return (
  <ProtectedRoute requiredAction="view" requiredResource="master_data_branches">
   <BranchFormClient
    id={params.id}
    createTitle={t('create_title')}
    editTitle={t('edit_title')}
    viewTitle={t('view_title')}
    locale={params.locale}
    isReadOnly={true}
   />
  </ProtectedRoute>
 );
}
