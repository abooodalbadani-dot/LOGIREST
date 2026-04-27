import { FXRatesClient } from './FXRatesClient';
import { PageHeader } from '@/components/shared/PageHeader';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'masterData.currencies' });
  return {
    title: `${t('fx_rates_title')} | LogiRest`,
    description: 'Historical exchange rates and currency conversion management',
  };
}

export default async function FXRatesPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('masterData.currencies');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title={t('fx_rates_title')} 
        description="Historical exchange rates and currency conversion management"
      />
      <FXRatesClient currencyId={params.id} />
    </div>
  );
}
