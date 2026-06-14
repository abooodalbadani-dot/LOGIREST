'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Search, ArrowRightLeft, Calendar, ShieldCheck, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useFXRates } from '@/features/fx-rates/hooks/useFXRates';
import { useCurrencies } from '@/features/currencies/hooks/useCurrencies';
import { type FXRate, type Currency } from '@/types/master-data';
import { formatRate } from '@/utils/currency';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { MetricCard } from '@/components/ui/metric-card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

export function FXRateListClient({ locale }: { locale: string }) {
  const t = useTranslations('common');
  const tfx = useTranslations('master_data.fx_rates');
  const tAuth = useTranslations('auth');
  const tPermissions = useTranslations('permissions');
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const redirectFired = useRef(false);

  const { data, isLoading } = useFXRates();
  const { data: currencies } = useCurrencies();
  const { user, isLoading: authLoading } = useAuth();

  const rates = data ?? [];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const normalizedRole = useMemo(() => {
    if (authLoading || !user) return null;
    return user.role === 'ADMIN' ? 'admin' :
           user.role === 'AUDITOR' ? 'auditor' :
           ['GM', 'INV_MGR', 'STORE_MGR', 'PROC_OFFICER'].includes(user.role) ? 'manager' : 'clerk';
  }, [user, authLoading]);

  const getUnauthorizedMessage = () => {
    try {
      const msg1 = t('errors.unauthorized');
      if (msg1 && msg1 !== 'errors.unauthorized') return msg1;
    } catch (e) {}

    try {
      const msg2 = tAuth('errors.unauthorized');
      if (msg2 && msg2 !== 'errors.unauthorized') return msg2;
    } catch (e) {}

    try {
      const msg3 = tPermissions('access_denied');
      if (msg3 && msg3 !== 'access_denied') return msg3;
    } catch (e) {}

    return locale === 'ar'
      ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة.'
      : 'You do not have permission to access this page.';
  };

  useEffect(() => {
    if (isMounted && !authLoading) {
      if (!user || normalizedRole === 'clerk') {
        if (!redirectFired.current) {
          redirectFired.current = true;
          toast.error(getUnauthorizedMessage());
          router.replace('/dashboard');
        }
      }
    }
  }, [isMounted, authLoading, user, normalizedRole, router, locale]);

  const stats = useMemo(() => {
    return {
      total: rates.length,
      active: rates.filter(r => r.isActive).length,
      lastUpdate: rates.length > 0 
        ? Math.max(...rates.map(r => new Date(r.effectiveDate).getTime()))
        : null
    };
  }, [rates]);

  const getCurrencyCode = (id: string, rateObj?: FXRate) => {
    if (rateObj) {
      if (rateObj.fromCurrencyId === id && rateObj.fromCurrency?.code) return rateObj.fromCurrency.code;
      if (rateObj.toCurrencyId === id && rateObj.toCurrency?.code) return rateObj.toCurrency.code;
    }
    return (currencies || []).find((c: Currency) => c.id === id)?.code || id;
  };

  const columns = useMemo<ColumnDef<FXRate, unknown>[]>(() => {
    const baseCols: ColumnDef<FXRate, unknown>[] = [
      {
        accessorKey: 'from_currency',
        header: tfx('fields.from_currency'),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span className="font-bold text-operational-cyan font-mono uppercase px-2 py-0.5 bg-operational-cyan/10 rounded-lg border border-operational-cyan/5">{getCurrencyCode(row.original.fromCurrencyId, row.original)}</span>
            <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground/40" />
            <span className="font-bold text-label-sm uppercase px-2 py-0.5 bg-surface-container rounded-lg border border-surface-variant/10">{getCurrencyCode(row.original.toCurrencyId, row.original)}</span>
          </div>
        )
      },
      {
        accessorKey: 'rate',
        header: tfx('fields.rate'),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-mono text-label-sm font-bold text-status-active tabular-nums">
              {formatRate(row.original.rate, locale as 'ar' | 'en', 4)}
            </span>
            <span className="text-label-xxs text-muted-foreground/60 font-medium">
              1 {getCurrencyCode(row.original.fromCurrencyId, row.original)} = {formatRate(row.original.rate, locale as 'ar' | 'en', 4)} {getCurrencyCode(row.original.toCurrencyId, row.original)}
            </span>
          </div>
        )
      },
      {
        accessorKey: 'effectiveDate',
        header: tfx('fields.effective_date'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-label-xs font-bold text-muted-foreground bg-surface-container/50 px-2.5 py-1 rounded-lg w-fit">
            <Calendar className="w-3.5 h-3.5 opacity-40 text-operational-cyan" />
            <ClientOnlyTime 
              date={row.original.effectiveDate} 
              mode="date" 
              locale={locale as 'ar' | 'en'} 
              fallback="--/--/----" 
            />
          </div>
        )
      },
      {
        accessorKey: 'isActive',
        header: t('status'),
        cell: ({ row }) => (
          <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} className="rounded-lg px-2.5" />
        )
      }
    ];

    baseCols.push({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const isAuditor = normalizedRole === 'auditor';
        return (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              disabled={isAuditor}
              className="text-label-xs font-bold uppercase text-operational-cyan hover:bg-operational-cyan/10 h-9 px-4 rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none"
              onClick={(e) => {
                if (isAuditor) return;
                e.stopPropagation();
                router.push(`/master-data/fx-rates/${row.original.id}/edit`);
              }}
            >
              {t('edit')}
            </Button>
          </div>
        );
      }
    });

    return baseCols;
  }, [t, tfx, router, currencies, locale, normalizedRole]);

  const breadcrumbs = [
    { label: t('home'), href: `/dashboard` },
    { label: t('master_data'), href: `/master-data` },
    { label: tfx('title'), href: `/master-data/fx-rates` }
  ];

  if (authLoading || !isMounted) {
    return <PageSkeleton variant="list" />;
  }

  if (!user || normalizedRole === 'clerk') {
    return null;
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="space-y-4">
        <Breadcrumb items={breadcrumbs} />
        <PageHeader 
          title={tfx('title')} 
          description={tfx('description')}
          actions={
            normalizedRole === 'auditor' ? (
              <Button disabled className="h-11 px-8 bg-operational-cyan text-white text-label-xs font-bold uppercase rounded-xl opacity-50 cursor-not-allowed">
                <Plus className="w-3.5 h-3.5 me-2" />
                {t('create_new')}
              </Button>
            ) : (
              <PermissionGate action="create" resource="master_data">
                <Link href={`/master-data/fx-rates/new`}>
                  <Button className="h-11 px-8 bg-operational-cyan hover:bg-operational-cyan/90 text-white text-label-xs font-bold uppercase rounded-xl transition-all shadow-lg shadow-operational-cyan/20">
                    <Plus className="w-3.5 h-3.5 me-2" />
                    {t('create_new')}
                  </Button>
                </Link>
              </PermissionGate>
            )
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label={tfx('metrics.total_rates')}
          value={stats.total}
          icon={ArrowRightLeft}
          color="cyan"
          dir="ltr"
        />

        <MetricCard
          label={t('active')}
          value={stats.active}
          icon={ShieldCheck}
          color="emerald"
          dir="ltr"
        />

        <MetricCard
          label={tfx('metrics.last_update')}
          value={stats.lastUpdate ? <ClientOnlyTime date={new Date(stats.lastUpdate)} mode="date" locale={locale as 'ar' | 'en'} /> : '—'}
          icon={History}
          color="amber"
          dir="ltr"
        />
      </div>

      <DataTable 
        columns={columns} 
        data={rates} 
        isLoading={isLoading}
        collectionName="master_data_fx_rates"
        emptyState={
          <EmptyState 
            variant="minimal"
            title={t('no_data')}
          />
        }
        filters={
          <div className="flex flex-wrap items-end gap-6 w-full py-4 px-6 bg-surface-container-low/50 border border-surface-variant/10 rounded-sm">
            <div className="flex flex-col gap-2 min-w-[300px] flex-1">
              <label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('search')}</label>
              <div className="relative">
                <Input
                  placeholder={tfx('search_placeholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-surface-container-highest/30 border-none h-11 ps-10 text-label-sm font-bold"
                />
                <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
