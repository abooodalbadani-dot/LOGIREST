import { setRequestLocale, getTranslations } from 'next-intl/server';
import { POListClient } from './POListClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'procurement.po' });
  return {
    title: `${t('title')} | LogiRest`,
    description: t('description') || 'External procurement commitments and supply chain pipeline',
  };
}

export default async function PurchaseOrdersPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);

  return (
    <ProtectedRoute requiredAction="view" requiredResource="procurement_po">
      <POListClient locale={params.locale as 'ar' | 'en'} />
    </ProtectedRoute>
  );
}
