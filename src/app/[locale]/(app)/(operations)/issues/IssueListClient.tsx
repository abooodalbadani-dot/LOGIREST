'use client';

import { useTranslations } from 'next-intl';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useIssueList } from '@/features/operations/hooks/useIssueList';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';

export function IssueListClient({ initialStatus, initialPage, locale }: { initialStatus?: string; initialPage: number; locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.issue');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data, isLoading } = useIssueList({ 
    status: initialStatus, 
    page: initialPage 
  });

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set('status', e.target.value);
    } else {
      params.delete('status');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">{t('issues')}...</div>;
  }

  const issues = data?.data || [];
  const meta = data?.meta?.pagination;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-6">
        <select 
          className="bg-surface-2 border border-surface-3 rounded px-4 py-2"
          value={initialStatus || ''}
          onChange={handleStatusChange}
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="APPROVED">Approved</option>
          <option value="POSTED">Posted</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="bg-surface-1 border border-surface-3 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-2 border-b border-surface-3">
              <th className="p-3 font-medium text-muted-foreground">{t('doc_number')}</th>
              <th className="p-3 font-medium text-muted-foreground">{t('destination')}</th>
              <th className="p-3 font-medium text-muted-foreground">Status</th>
              <th className="p-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {issues.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  No issues found.
                </td>
              </tr>
            ) : issues.map((issue) => (
              <tr key={issue.id} className="border-b border-surface-3 last:border-0 hover:bg-surface-2/50 transition-colors">
                <td className="p-3 font-mono text-neon-cyan">{issue.document_number}</td>
                <td className="p-3">{issue.destination_department_id || '-'}</td>
                <td className="p-3">
                  <StatusBadge status={issue.status as any} />
                </td>
                <td className="p-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => router.push(`/${locale}/issues/${issue.id}`)}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && meta.total_pages > 1 && (
        <div className="flex justify-between items-center bg-surface-2 p-4 rounded border border-surface-3">
          <Button 
            variant="outline" 
            disabled={meta.page <= 1}
            onClick={() => handlePageChange(meta.page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm">Page {meta.page} of {meta.total_pages}</span>
          <Button 
            variant="outline" 
            disabled={meta.page >= meta.total_pages}
            onClick={() => handlePageChange(meta.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
