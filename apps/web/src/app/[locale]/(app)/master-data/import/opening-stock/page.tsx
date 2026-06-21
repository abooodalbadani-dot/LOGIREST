import { ImportWizardClient } from '@/features/import/components/ImportWizardClient';

export default async function OpeningStockImportPage({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;
  return <ImportWizardClient entity="openingStock" locale={locale} />;
}
