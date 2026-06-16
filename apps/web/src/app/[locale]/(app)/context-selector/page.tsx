import { setRequestLocale } from 'next-intl/server';
import { ContextSelectorClient } from './ContextSelectorClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Suspense } from 'react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 return {
 title: `Context Selector | Otantik مطاعم`,
 };
}

export default async function ContextSelectorPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 
 return (
 <ProtectedRoute>
 <Suspense fallback={<LoadingSpinner />}>
 <ContextSelectorClient locale={params.locale} />
 </Suspense>
 </ProtectedRoute>
 );
}
