import { BarcodeMappingClient } from './BarcodeMappingClient';

export default async function BarcodeMappingPage({
 params,
}: {
 params: Promise<{ locale: string }>;
}) {
 const { locale } = await params;
 return <BarcodeMappingClient locale={locale} />;
}
