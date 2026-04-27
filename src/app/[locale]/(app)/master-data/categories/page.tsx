import { CategoryListClient } from './CategoryListClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PageHeader } from '@/components/shared/PageHeader';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'masterData.categories' });
  return {
    title: `${t('title')} | LogiRest`,
    description: 'Item category and classification management',
  };
}

export default async function CategoriesPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('masterData.categories');
  
  return (
    <ProtectedRoute requiredAction="view" requiredResource="master_data">
      <div className="flex flex-col gap-6">
        <PageHeader 
          title={t('title')} 
          description="Item category and classification management"
        />
        <CategoryListClient locale={params.locale} />
      </div>
    </ProtectedRoute>
  );
}
