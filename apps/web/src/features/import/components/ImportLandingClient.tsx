'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Package, Hash, Ruler, ArrowRight, ImportIcon } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { cn } from '@/lib/utils';

interface ImportLandingClientProps {
 locale: string;
}

export function ImportLandingClient({ locale }: ImportLandingClientProps) {
 const t = useTranslations('master_data.import');
 const tc = useTranslations('common');
 const router = useRouter();
 const isRtl = locale === 'ar';

 const cards = [
 {
 id: 'items',
 title: t('items'),
 description: t('items_desc'),
 icon: Package,
 href: '/master-data/import/items',
 color: 'cyan'
 },
 {
 id: 'uoms',
 title: t('uoms'),
 description: t('uoms_desc'),
 icon: Ruler,
 href: '/master-data/import/uoms',
 color: 'emerald'
 },
 {
 id: 'barcodes',
 title: t('barcodes'),
 description: t('barcodes_desc'),
 icon: Hash,
 href: '/master-data/import/barcodes',
 color: 'blue'
 }
 ];

 return (
 <div className="flex flex-col gap-8 p-8 max-w-6xl mx-auto animate-in fade-in duration-200">
 <Breadcrumb
 items={[
 { label: tc('navigation.master_data'), href: '/master-data' },
 { label: t('title') }
 ]}
 />

 <PageHeader
 title={t('title')}
 description={t('select_type')}
 icon={<ImportIcon className="w-6 h-6 text-cyan-500" />}
 />

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
 {cards.map((card, idx) => {
 const Icon = card.icon;
 return (
 <button
 key={card.id}
 onClick={() => router.push(card.href)}
 style={{ animationDelay: `${idx * 100}ms` }}
 className="group relative flex flex-col items-start text-start p-8 rounded-2xl bg-surface-container-low/50 transition-all duration-200 hover:scale-[1.02] hover:bg-surface-container-high hover:border-cyan-500/20 shadow-xl overflow-hidden animate-in slide-in-from-bottom-8 fill-mode-both"
 >
 {/* Background Glow */}
 <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-colors" />
 
 <div className={cn(
 "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-200 group-hover:scale-110 group-hover:rotate-3",
 card.color === 'cyan' && "bg-cyan-500/10 text-cyan-500",
 card.color === 'emerald' && "bg-emerald-500/10 text-emerald-500",
 card.color === 'blue' && "bg-blue-500/10 text-blue-500"
 )}>
 <Icon className="w-8 h-8" />
 </div>

 <div className="space-y-2 relative z-10">
  <h3 className="text-title-lg font-semibold text-foreground group-hover:text-cyan-500 transition-colors">
  {card.title}
  </h3>
 <p className="text-body-md text-muted-foreground font-medium leading-relaxed opacity-70">
 {card.description}
 </p>
 </div>

  <div className="mt-8 flex items-center gap-2 text-label-xs font-semibold text-cyan-500/60 group-hover:text-cyan-500 transition-all">
  <span>{t('start_import')}</span>
 <ArrowRight className={cn(
 "w-4 h-4 transition-transform group-hover:translate-x-2",
 isRtl && "rotate-180 group-hover:-translate-x-2"
 )} />
 </div>
 </button>
 );
 })}
 </div>

 {/* Info Box */}
 <div className="mt-8 p-6 rounded-2xl bg-surface-container-lowest/50 flex items-center gap-6 max-w-2xl">
 <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
 <ImportIcon className="w-6 h-6" />
 </div>
 <div className="space-y-1">
  <p className="text-label-xs font-semibold text-amber-500/80">
  {t('note_title')}
  </p>
 <p className="text-label-sm text-muted-foreground font-medium">
 {t('note_description')}
 </p>
 </div>
 </div>
 </div>
 );
}

