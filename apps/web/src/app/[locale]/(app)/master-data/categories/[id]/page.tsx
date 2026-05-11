import { setRequestLocale, getTranslations } from 'next-intl/server';
import { CategoryFormClient } from '../CategoryFormClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'master_data.categories' });
  return {
    title: `${t('view_title')} | LogiRest`,
  };
}

export default async function CategoryDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('master_data.categories');
  
  return (
    <ProtectedRoute requiredAction="view" requiredResource="master_data_categories">
      <CategoryFormClient
        id={params.id}
        createTitle={t('create_title')}
        editTitle={t('edit_title')}
        viewTitle={t('view_title')}
        isReadOnly={true}
      />
    </ProtectedRoute>
  );
}
