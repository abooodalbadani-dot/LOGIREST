import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { IssueListClient } from './IssueListClient';

export default async function IssuesPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { locale } = await props.params;
  const { status, page } = await props.searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('operations.issue');

  return (
    <ProtectedRoute requiredAction="view" requiredResource="issue">
      <IssueListClient 
        initialStatus={status} 
        initialPage={Number(page ?? 1)} 
        locale={locale as 'ar' | 'en'} 
      />
    </ProtectedRoute>
  );
}
