import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ItemListClient } from './ItemListClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PageHeader } from '@/components/shared/PageHeader';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'masterData.items' });
  return {
    title: `${t('title')} | LogiRest`,
    description: t('description') || 'Master inventory catalog and product specification directory',
  };
}

export default async function ItemsPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('masterData.items');
  return (
    <ProtectedRoute requiredAction="view" requiredResource="master_data_items">
      <div className="flex flex-col gap-6">
        <PageHeader 
          title={t('title')} 
          description={t('description') || 'Master inventory catalog and product specification directory'}
        />
        <ItemListClient locale={params.locale} />
      </div>
    </ProtectedRoute>
  );
}
