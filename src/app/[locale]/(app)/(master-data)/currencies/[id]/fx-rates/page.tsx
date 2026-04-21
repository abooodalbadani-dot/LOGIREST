import { setRequestLocale, getTranslations } from 'next-intl/server';
import { FXRatesClient } from './FXRatesClient';

export default async function FXRatesPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('masterData.currencies');
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('fx_rates_title')}</h1>
      <FXRatesClient currencyId={params.id} />
    </div>
  );
}
