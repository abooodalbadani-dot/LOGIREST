'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
<<<<<<< HEAD:src/app/[locale]/(app)/inventory/lots/LotBalanceClient.tsx
import { useRouter } from '@/i18n/navigation';
=======
import { useRouter, Link } from '@/i18n/navigation';
>>>>>>> 002-frontend-baseline:apps/web/src/app/[locale]/(app)/inventory/lots/LotBalanceClient.tsx
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { 
 History, 
 Package, 
 ArrowUpRight, 
 ArrowDownLeft, 
 Calendar, 
 ShieldCheck, 
 MapPin,
 Clock,
 Printer,
 Edit,
 Scan,
 Database
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface LotMovement {
 id: string;
 date: string;
 type: string;
 qty: number;
 balance: number;
 reference: string;
 user: string;
}

// Mock movement data for the ledger
const MOCK_MOVEMENTS: LotMovement[] = [
 { id: '1', date: '2024-05-15T10:00:00Z', type: 'IN', qty: 500, balance: 500, reference: 'PO-2024-0012', user: 'أحمد محمود' },
 { id: '2', date: '2024-05-16T14:30:00Z', type: 'OUT', qty: 50, balance: 450, reference: 'TR-9902', user: 'سارة خالد' },
 { id: '3', date: '2024-05-18T09:15:00Z', type: 'OUT', qty: 100, balance: 350, reference: 'ADJ-102', user: 'محمد علي' },
 { id: '4', date: '2024-05-20T11:45:00Z', type: 'OUT', qty: 25, balance: 325, reference: 'TR-9915', user: 'سارة خالد' },
];

export default function LotBalanceClient() {
 const locale = useLocale() as 'ar' | 'en';
 const router = useRouter();
 const isRtl = locale === 'ar';
 const t = useTranslations('operational.lots');
 const tc = useTranslations('common');

 const columns: ColumnDef<LotMovement, unknown>[] = [
 {
 accessorKey: 'date',
 header: t('table.datetime'),
 cell: ({ row }) => (
 <span dir="ltr" className="text-label-xs font-bold text-muted-foreground/60">
 {format(new Date(row.original.date), 'dd MMM yyyy, HH:mm')}
 </span>
 ),
 },
 {
 accessorKey: 'type',
 header: t('table.type'),
 cell: ({ row }) => (
 <div className="flex items-center gap-2">
 {row.original.type === 'IN' ? (
 <ArrowDownLeft className="w-4 h-4 text-status-success" />
 ) : (
 <ArrowUpRight className="w-4 h-4 text-status-warning" />
 )}
 <span className={`text-label-xs font-semibold uppercase ${row.original.type === 'IN' ? 'text-status-success' : 'text-status-warning'}`}>
 {row.original.type === 'IN' ? t('table.entry') : t('table.exit')}
 </span>
 </div>
 ),
 },
 {
 accessorKey: 'qty',
 header: t('table.qty'),
 cell: ({ row }) => (
 <span dir="ltr" className={`font-mono text-label-sm font-semibold ${row.original.type === 'IN' ? 'text-status-success' : 'text-status-warning'}`}>
 {row.original.type === 'IN' ? '+' : '-'}{row.original.qty.toLocaleString()}
 </span>
 ),
 },
 {
 accessorKey: 'balance',
 header: t('table.balance'),
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono text-label-sm font-semibold text-foreground">
 {row.original.balance.toLocaleString()}
 </span>
 ),
 },
 {
 accessorKey: 'reference',
 header: t('table.reference'),
 cell: ({ row }) => (
 <span className="font-mono text-label-xs font-semibold text-operational-cyan uppercase">
 {row.original.reference}
 </span>
 ),
 },
 {
 accessorKey: 'user',
 header: t('table.user'),
 cell: ({ row }) => (
 <span className="text-label-xs font-bold text-muted-foreground/60">
 {row.original.user}
 </span>
 ),
 },
 ];

 return (
 <div className="min-h-screen bg-surface text-foreground p-4 lg:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
 
 {/* Header: Lot Profile */}
 <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
 <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-start">
 <div className="w-32 h-32 rounded-2xl bg-surface-ledger text-white flex flex-col items-center justify-center shadow-2xl shadow-surface-ledger/20 relative overflow-hidden group">
 <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
 <Database className="w-8 h-8 mb-1 opacity-40" />
 <span className="text-label-xs font-semibold uppercase opacity-60">{t('lot_tag')}</span>
 <span className="text-headline-lg font-semibold">9942</span>
 </div>
 <div className="space-y-2">
 <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
 <h1 className="text-headline-lg font-semibold text-foreground uppercase">LOT-2024-0012</h1>
 <Badge className="bg-status-success/10 text-status-success border-none text-label-xs font-semibold px-4 h-7 rounded-full uppercase">
 {t('status_valid')}
 </Badge>
 </div>
 <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
 <div className="flex items-center gap-2">
 <Package className="w-4 h-4 text-muted-foreground/40" />
 <span className="text-body-md font-semibold text-muted-foreground/60 uppercase">{isRtl ? 'زيت زيتون بكر ممتاز - 1 لتر' : 'Extra Virgin Olive Oil - 1L'}</span>
 </div>
 <div className="w-px h-4 bg-on-surface/10 hidden md:block" />
 <div className="flex items-center gap-2 text-status-error">
 <Calendar className="w-4 h-4" />
 <span className="text-body-md font-semibold uppercase">{t('expiry_label', { date: '31 Dec 2025' })}</span>
 </div>
 </div>
 </div>
 </div>
 
 <div className="flex flex-wrap items-center gap-4">
 <div className="bg-surface-container-lowest px-8 py-4 rounded-2xl border border-border-muted/50 shadow-xl text-center">
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mb-1">{t('available_balance')}</p>
 <p className="text-headline-lg font-semibold text-foreground">325 <span className="text-label-sm text-muted-foreground/40 uppercase">{t('units')}</span></p>
 </div>
 </div>
 </div>

 {/* Stats Grid */}
 <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {[
 { label: t('total_entry'), value: '500', icon: ArrowDownLeft, color: 'text-status-success', bg: 'bg-status-success/10' },
 { label: t('total_exit'), value: '175', icon: ArrowUpRight, color: 'text-status-warning', bg: 'bg-status-warning/10' },
 { label: t('storage_node'), value: 'WH-01-A4', icon: MapPin, color: 'text-operational-cyan', bg: 'bg-operational-cyan/10' },
 { label: t('last_activity'), value: '11:45 AM', icon: Clock, color: 'text-muted-foreground/60', bg: 'bg-surface-container-low' },
 ].map((stat, i) => (
 <div key={i} className="p-6 rounded-2xl bg-surface-container-lowest border border-border-muted/50 flex items-center gap-5">
 <div className={`w-12 h-12 rounded-2xl ${stat.bg}flex items-center justify-center shrink-0`}>
 <stat.icon className={`w-6 h-6 ${stat.color}`} />
 </div>
 <div>
 <p className="text-label-xxs font-semibold text-muted-foreground/60 uppercase">{stat.label}</p>
 <p className="text-title-lg font-semibold text-foreground uppercase">{stat.value}</p>
 </div>
 </div>
 ))}
 </div>

 {/* Ledger Table */}
 <div className="max-w-[1600px] mx-auto space-y-6">
 <div className="flex items-center justify-between px-6">
 <div className="flex items-center gap-4">
 <div className="w-1.5 h-10 bg-operational-cyan rounded-full" />
 <div className="flex flex-col">
 <h2 className="text-headline-lg font-semibold text-foreground">
 {t('title')}
 </h2>
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase">
 {t('subtitle')}
 </p>
 </div>
 </div>
 <Button 
 variant="ghost" 
 onClick={() => window.print()}
 className="h-10 px-6 rounded-xl bg-surface-container-low border border-white/5 text-label-xxs font-semibold uppercase gap-2"
 >
 <History className="w-3 h-3 text-operational-cyan" />
 {t('export_ledger')}
 </Button>
 </div>

 <div className="bg-surface-container-lowest rounded-2xl border border-border-muted/50 overflow-hidden shadow-2xl">
 <DataTable 
 columns={columns}
 data={MOCK_MOVEMENTS}
 isLoading={false}
 collectionName="lot_ledger_protocol"
 />
 </div>
 </div>

 {/* Floating Action Bar */}
 <div className="fixed bottom-12 start-1/2 -translate-x-1/2 z-50">
 <div className="flex items-center gap-8 bg-surface-ledger/95 backdrop-blur-2xl border border-operational-cyan/20 px-10 h-16 rounded-full shadow-2xl transition-all hover:scale-[1.02] group">
 <div className="flex items-center gap-6">
 <button 
 onClick={() => router.push('/inventory/scan-mode')}
 className="flex items-center gap-3 text-label-xs font-semibold uppercase text-foreground hover:text-operational-cyan transition-colors"
 >
 <Scan className="w-4 h-4 text-operational-cyan" />
 {tc('barcode_scanner')}
 </button>
 <div className="w-px h-6 bg-white/5" />
 <button 
 onClick={() => router.push('/transfers/new')}
 className="flex items-center gap-3 text-label-xs font-semibold uppercase text-foreground hover:text-operational-cyan transition-colors"
 >
 <MapPin className="w-4 h-4 text-operational-cyan/60" />
 {t('relocate')}
 </button>
 <div className="w-px h-6 bg-white/5" />
 <button 
 onClick={() => window.print()}
 className="flex items-center gap-3 text-label-xs font-semibold uppercase text-foreground hover:text-operational-cyan transition-colors"
 >
 <Printer className="w-4 h-4 text-operational-cyan/60" />
 {t('print_label')}
 </button>
 <div className="w-px h-6 bg-white/5" />
 <button 
 onClick={() => router.push('/adjustments/new')}
 className="flex items-center gap-3 text-label-xs font-semibold uppercase text-foreground hover:text-operational-cyan transition-colors"
 >
 <Edit className="w-4 h-4 text-operational-cyan/60" />
 {t('adjust')}
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
