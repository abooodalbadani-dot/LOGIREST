import { getTranslations } from 'next-intl/server';
import DashboardClient from './DashboardClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'dashboard' });
 return {
 title: `Dashboard | LogiRest`,
 description: t('description') || 'Operational overview and real-time inventory metrics',
 };
}

export default function DashboardPage() {
 return <DashboardClient />;
}
