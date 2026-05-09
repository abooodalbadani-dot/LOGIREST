import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ItemFormClient } from '../ItemFormClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'master_data.items' });
 return {
 title: `${t('create_title')} | LogiRest`,
 };
}

export default async function NewItemPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('master_data.items');
  
  return (
    <ProtectedRoute requiredAction="create" requiredResource="master_data_items">
      <ItemFormClient
        id={null}
        createTitle={t('create_title')}
        editTitle={t('edit_title')}
        viewTitle={t('view_title')}
        locale={params.locale}
        isReadOnly={false}
      />
    </ProtectedRoute>
  );
}
