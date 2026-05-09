import { setRequestLocale, getTranslations } from 'next-intl/server';
import { DepartmentFormClient } from '../DepartmentFormClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'master_data.departments' });
  return {
    title: `${t('view_title')} | LogiRest`,
  };
}

export default async function DepartmentDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations({ locale: params.locale, namespace: 'master_data.departments' });

  return (
    <ProtectedRoute requiredAction="view" requiredResource="master_data_departments">
      <DepartmentFormClient
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
