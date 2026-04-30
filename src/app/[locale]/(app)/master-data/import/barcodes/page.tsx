import { ImportWizardClient } from '@/features/import/components/ImportWizardClient';

export default async function BarcodesImportPage({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;
  return <ImportWizardClient type="barcodes" locale={locale} />;
}
