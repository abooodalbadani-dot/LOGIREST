import { GRNPostClient } from './GRNPostClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { apiClient } from '@/lib/api/client';
import { GRNDetailSchema } from '@/features/purchasing/hooks/useGRN';
import { z } from 'zod';
import { redirect } from '@/i18n/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string, id: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'procurement.grn' });
  return {
    title: `${t('post_grn')} | LogiRest`,
  };
}

export default async function GRNPostPage(props: { params: Promise<{ locale: string, id: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  
  let grn;
  try {
    const response = await apiClient.get(`/procurement/grns/${params.id}`, z.object({ data: GRNDetailSchema }));
    grn = response.data;
  } catch {
    // Fallback if API fails
  }

  if (grn) {
    if (grn.status === 'POSTED') {
      redirect({ href: `/goods-received/${params.id}`, locale: params.locale });
    }
    if (grn.status !== 'APPROVED') { 
      redirect({ href: `/goods-received/${params.id}`, locale: params.locale });
    }
  }

  return (
    <ProtectedRoute requiredAction="post" requiredResource="grn">
      <GRNPostClient id={params.id} />
    </ProtectedRoute>
  );
}
