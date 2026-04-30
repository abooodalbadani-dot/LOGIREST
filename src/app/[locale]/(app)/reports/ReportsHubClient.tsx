'use client';

import { useTranslations } from 'next-intl';
import { BarChart3, Clock, ShoppingCart, ClipboardCheck, Wallet, Activity, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}

function ReportCard({ title, description, icon, href }: ReportCardProps) {
  return (
    <Link 
      href={href}
      className="group relative p-8 rounded-3xl border border-border-muted/20 bg-surface-container-low/90 backdrop-blur-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] hover:bg-surface-container-high/95 hover:border-operational-cyan/30 transition-all duration-500 overflow-hidden animate-in fade-in zoom-in-95 fill-mode-both"
    >
      <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-transparent via-operational-cyan/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-surface-container-high/50 flex items-center justify-center text-operational-cyan shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] group-hover:shadow-[0_0_30px_rgba(var(--operational-cyan-rgb),0.3)] transition-all duration-500 border border-border-muted/10 group-hover:border-operational-cyan/20">
            {icon}
          </div>
          <div>
            <h3 className="font-black text-foreground text-lg tracking-tight uppercase tracking-wider">{title}</h3>
            <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-[240px] font-bold mt-1 uppercase tracking-wide">{description}</p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-operational-cyan group-hover:translate-x-1 transition-all duration-300 rtl:group-hover:-translate-x-1" />
      </div>

      <div className="mt-10 flex items-center justify-between">
        <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-8 h-8 rounded-full border-[2px] border-surface-container-low bg-surface-container-high flex items-center justify-center text-[10px] font-black text-muted-foreground/40 shadow-sm -ms-3 first:ms-0 group-hover:border-operational-cyan/10 transition-colors">
              {i}
            </div>
          ))}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 group-hover:text-operational-cyan transition-colors">
          View Report
        </span>
      </div>
    </Link>
  );
}

export function ReportsHubClient() {
  const t = useTranslations('reports');
  const pathname = usePathname();

  const reportLinks = [
    {
      title: t('available_inventory'),
      description: t('available_inventory_desc'),
      icon: <BarChart3 className="w-6 h-6" />,
      href: `${pathname}/available-inventory`,
    },
    {
      title: t('movements'),
      description: t('movements_desc'),
      icon: <Activity className="w-6 h-6" />,
      href: `${pathname}/movements`,
    },
    {
      title: t('expiry'),
      description: t('expiry_desc'),
      icon: <Clock className="w-6 h-6" />,
      href: `${pathname}/expiry`,
    },
    {
      title: t('stocktake_variance'),
      description: t('stocktake_variance_desc'),
      icon: <ClipboardCheck className="w-6 h-6" />,
      href: `${pathname}/stocktake-variance`,
    },
    {
      title: t('procurement_status'),
      description: t('procurement_status_desc'),
      icon: <ShoppingCart className="w-6 h-6" />,
      href: `${pathname}/procurement-status`,
    },
    {
      title: t('currency_summaries'),
      description: t('currency_summaries_desc'),
      icon: <Wallet className="w-6 h-6" />,
      href: `${pathname}/currency-summaries`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {reportLinks.map((r) => (
        <ReportCard key={r.title} {...r} />
      ))}
    </div>
  );
}