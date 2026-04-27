import { UoMListClient } from './UoMListClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PageHeader } from '@/components/shared/PageHeader';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'masterData.uom' });
  return {
    title: `${t('title')} | LogiRest`,
    description: 'Unit of measure and conversion factor management',
  };
}

export default async function UnitsOfMeasurePage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('masterData.uom');
  
  return (
    <ProtectedRoute requiredAction="view" requiredResource="master_data">
      <div className="flex flex-col gap-6">
        <PageHeader 
          title={t('title')} 
          description="Unit of measure and conversion factor management"
        />
        <UoMListClient locale={params.locale} />
      </div>
    </ProtectedRoute>
  );
}
