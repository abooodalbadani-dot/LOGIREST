import { GRNPostClient } from './GRNPostClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { apiClient } from '@/lib/api/client';
import { GRNDetailSchema } from '@/features/purchasing/hooks/useGRN';
import { z } from 'zod';
import { redirect } from '@/i18n/navigation';
import { GRN_STATUS } from '@logirest/shared-types';

export async function generateMetadata({ params }: { params: Promise<{ locale: string, id: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'procurement.grn' });
  return {
    title: `${t('post_grn')} | Otantik مطاعم`,
  };
}

export default async function GRNPostPage(props: { params: Promise<{ locale: string, id: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  
  // In a real app, we'd fetch here. In frontend-only/mock mode, 
  // we'll handle the status check in the client or provide a mock here.
  // The request specifically asks for server component logic.
  
  let grn;
  try {
    // We try to fetch the GRN to check status server-side
    const response = await apiClient.get(`/procurement/grns/${params.id}`, z.object({ data: GRNDetailSchema }));
    grn = response.data;
  } catch {
    // Fallback if API fails (e.g. in development without mock server)
    // We'll let the client handle it if we can't fetch server-side
  }

  // PART 1 logic
  if (grn) {
    if (grn.status === GRN_STATUS.POSTED) {
      redirect({ href: `/goods-received/${params.id}`, locale: params.locale });
    }
    if (grn.status !== GRN_STATUS.RECEIVED) { 
      redirect({ href: `/goods-received/${params.id}`, locale: params.locale });
    }
  }

  return (
    <ProtectedRoute requiredAction="post" requiredResource="grn">
      <GRNPostClient id={params.id} locale={params.locale as 'ar' | 'en'} />
    </ProtectedRoute>
  );
}
