import { ImportWizardClient } from '@/features/import/components/ImportWizardClient';

export default async function SuppliersImportPage({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;
  return <ImportWizardClient entity="suppliers" locale={locale} />;
}
