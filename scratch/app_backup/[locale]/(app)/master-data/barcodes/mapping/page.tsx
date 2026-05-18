import { BarcodeMappingClient } from './BarcodeMappingClient';

export default async function BarcodeMappingPage({
  params: { locale }
}: {
  params: { locale: string };
}) {
  return <BarcodeMappingClient locale={locale} />;
}
