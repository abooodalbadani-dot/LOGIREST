import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { GRNListClient } from './GRNListClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'procurement.grn' });
  return {
    title: `${t('title')} | LogiRest`,
    description: t('description') || 'Incoming supply chain verification and warehouse reception ledger',
  };
}

export default async function GoodsReceivedPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { locale } = await props.params;
  const { status, page } = await props.searchParams;
  const t = await getTranslations('procurement.grn');

  return (
    <ProtectedRoute requiredAction="view" requiredResource="grn">
      <GRNListClient 
        initialStatus={status} 
        initialPage={Number(page ?? 1)} 
        locale={locale as 'ar' | 'en'} 
      />
    </ProtectedRoute>

  );
}
