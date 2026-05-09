import { FXRateListClient } from './FXRateListClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PageHeader } from '@/components/shared/PageHeader';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'master_data.fx_rates' });
  return {
    title: `${t('title')} | LogiRest`,
    description: 'Foreign exchange rate and currency conversion management',
  };
}

export default async function FXRatesPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('master_data.fx_rates');
  
  return (
    <ProtectedRoute requiredAction="view" requiredResource="master_data">
      <div className="flex flex-col gap-6">
        <PageHeader 
          title={t('title')} 
          description={t('description')}
        />
        <FXRateListClient locale={params.locale} />
      </div>
    </ProtectedRoute>
  );
}
