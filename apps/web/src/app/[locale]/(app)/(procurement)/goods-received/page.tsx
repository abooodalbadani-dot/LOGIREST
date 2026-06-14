import { getTranslations } from 'next-intl/server';

import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { GRNListClient } from './GRNListClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'procurement.grn' });
    return {
        title: `${t('title')} | Otantik مطاعم`,
        description: t('description'),
    };
}

export default async function GoodsReceivedPage(props: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ status?: string; page?: string }>;
}) {
    const { locale } = await props.params;
    const { status, page } = await props.searchParams;
    return (
        <ProtectedRoute requiredAction="view" requiredResource="grn">
            <GRNListClient
                initialStatus={status}
                initialPage={Number(page ?? 1)}
                locale={locale as 'ar' | 'en'} />
        </ProtectedRoute>

    );
}
