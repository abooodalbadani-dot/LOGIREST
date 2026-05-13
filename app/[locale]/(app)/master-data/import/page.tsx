import { ImportLandingClient } from '@/features/import/components/ImportLandingClient';

export default async function ImportPage(props: { params: Promise<{ locale: string }> }) {
 const { locale } = await props.params;
 
 return <ImportLandingClient locale={locale} />;
}
