import { FXRateListClient } from './FXRateListClient';

export default async function FXRatesPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  return <FXRateListClient locale={locale} />;
}
