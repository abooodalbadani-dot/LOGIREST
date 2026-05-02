'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle2, XCircle } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { useNotificationTemplates, type NotificationTemplateRow } from '@/features/notifications/hooks/useNotificationTemplates';

import { ColumnDef } from '@tanstack/react-table';

export function TemplateListClient({ locale }: { locale: string }) {
 const t = useTranslations('notifications');
 const router = useRouter();
 const [page, setPage] = useState(1);
 const { data, isLoading } = useNotificationTemplates({ page });

 const columns: ColumnDef<NotificationTemplateRow>[] = [
 {
 accessorKey: 'code',
 header: t('code'),
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono text-label-sm text-cyan-500 font-bold bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10">
 {row.original.code}
 </span>
 ),
 },
 {
 accessorKey: 'trigger_event',
 header: t('trigger_event'),
 cell: ({ row }) => (
 <span className="text-body-md font-medium">{row.original.trigger_event}</span>
 ),
 },
 {
 accessorKey: 'is_active',
 header: t('is_active'),
 cell: ({ row }) => row.original.is_active
 ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]" />
 : <XCircle className="w-4 h-4 text-red-500/50" />,
 },
 ];


 return (
 <div className="flex flex-col gap-4">
 <DataTable
 columns={columns}
 data={data?.data ?? []}
 isLoading={isLoading}
 onRowClick={(row: NotificationTemplateRow) => router.push(`/ ${locale}/communications/notifications/templates/ ${row.id}`)}
 />
 {data?.meta && data.meta.total_pages > 1 && (
 <Pagination page={page} totalPages={data.meta.total_pages} onPageChange={setPage} />
 )}
 </div>
 );
}