import { ImportWizardClient } from '@/features/import/components/ImportWizardClient';

export default async function UomsImportPage({ 
 params 
}: { 
 params: Promise<{ locale: string }> 
}) {
 const { locale } = await params;
 return <ImportWizardClient entity="uoms" locale={locale} />;
}
