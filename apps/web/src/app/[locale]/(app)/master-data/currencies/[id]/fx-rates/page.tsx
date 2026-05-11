import { FXRatesClient } from './FXRatesClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'master_data.currencies' });
 return {
 title: `${t('fx_rates_title')} | LogiRest`,
 description: 'Historical exchange rates and currency conversion management',
 };
}

export default async function FXRatesPage(props: { params: Promise<{ locale: string; id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 return (
  <FXRatesClient currencyId={params.id} locale={params.locale as 'ar' | 'en'} />
 );
}
