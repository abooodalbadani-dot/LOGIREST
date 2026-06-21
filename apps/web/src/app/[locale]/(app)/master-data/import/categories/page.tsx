import { ImportWizardClient } from '@/features/import/components/ImportWizardClient';

export default async function CategoriesImportPage({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;
  return <ImportWizardClient entity="categories" locale={locale} />;
}
