import { setRequestLocale } from 'next-intl/server';
import { ContextSelectorClient } from './ContextSelectorClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
 return {
 title: `Context Selector | LogiRest`,
 };
}

export default async function ContextSelectorPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 
 return (
 <ProtectedRoute>
 <ContextSelectorClient locale={params.locale} />
 </ProtectedRoute>
 );
}
