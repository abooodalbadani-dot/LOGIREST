import { ImportWizardClient } from '@/features/import/components/ImportWizardClient';

export default async function ItemsImportPage({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;
  return <ImportWizardClient type="items" locale={locale} />;
}
