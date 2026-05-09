import { setRequestLocale, getTranslations } from 'next-intl/server';
import { CurrencyFormClient } from '../CurrencyFormClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'master_data.currencies' });
  return { title: `${t('view_title')} | LOGIREST` };
}

export default async function CurrencyDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('master_data.currencies');
  
  return (
    <ProtectedRoute action="view" resource="master_data">
      <CurrencyFormClient
        id={params.id}
        createTitle={t('create_title')}
        editTitle={t('edit_title')}
        viewTitle={t('view_title')}
        isReadOnly={true}
        locale={params.locale}
      />
    </ProtectedRoute>
  );
}
