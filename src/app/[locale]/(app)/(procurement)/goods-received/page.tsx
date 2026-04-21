import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { GRNListClient } from './GRNListClient';

export default async function GoodsReceivedPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { locale } = await props.params;
  const { status, page } = await props.searchParams;
  const t = await getTranslations('procurement.grn');

  return (
    <ProtectedRoute requiredAction="view" requiredResource="grn">
      <div className="space-y-6">
        <PageHeader 
          title={t('title')} 
          actions={
            <Link href={`/${locale}/goods-received/new`}>
              <Button>{t('create_new')}</Button>
            </Link>
          } 
        />
        <div className="text-sm text-muted-foreground mb-4">
          {t('home')} / {t('grns')}
        </div>
        <GRNListClient 
          initialStatus={status} 
          initialPage={Number(page ?? 1)} 
          locale={locale as any} 
        />
      </div>
    </ProtectedRoute>
  );
}
