'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { 
 Search as SearchIcon, 
 Package, 
 FileText, 
 Database, 
 Truck, 
 Clock, 
 ArrowRight,
 Filter,
 Layers,
 ChevronRight,
 Command,
 X,
 LayoutGrid,
 Calendar,
 AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface SearchResult {
 id: string;
 type: 'item' | 'document' | 'lot' | 'supplier';
 title: string;
 subtitle: string;
 status?: string;
 metadata?: Record<string, string>;
 image?: string;
 link: string;
}

export default function SearchClient() {
 const locale = useLocale() as 'ar' | 'en';
 const isRtl = locale === 'ar';
 const searchParams = useSearchParams();
 const router = useRouter();
 const query = searchParams.get('q') || '';
 const [searchTerm, setSearchTerm] = useState(query);
 const [isLoading, setIsLoading] = useState(false);
 
 const t = useTranslations('operational.search');
 const tc = useTranslations('common');

 const [results, setResults] = useState<SearchResult[]>([]);

 useEffect(() => {
 let loadingTimer: ReturnType<typeof setTimeout>;
 let resultsTimer: ReturnType<typeof setTimeout>;

 if (query) {
 // Use setTimeout to avoid synchronous setState in effect body
 loadingTimer = setTimeout(() => {
 setIsLoading(true);
 }, 0);
 
 resultsTimer = setTimeout(() => {
 setResults([
 {
 id: '1',
 type: 'item',
 title: isRtl ? 'أرز بسمتي فاخر' : 'Premium Basmati Rice',
 subtitle: 'SKU: BR-001',
 status: 'ACTIVE',
 metadata: { [isRtl ? 'المخزون' : 'Stock']: '1,200 KG', [isRtl ? 'الموقع' : 'Location']: 'WH-01' },
 link: `/inventory/balance`,
 },
 {
 id: '2',
 type: 'document',
 title: 'PO-2024-0042',
 subtitle: isRtl ? 'مورد: بهارات العالم' : 'Vendor: Global Spice',
 status: 'PENDING',
 metadata: { [isRtl ? 'التاريخ' : 'Date']: '2024-04-20', [isRtl ? 'الإجمالي' : 'Total']: '4,250 SAR' },
 link: `/purchase-orders/PO-2024-0042`,
 },
 {
 id: '3',
 type: 'lot',
 title: 'LOT-9942-A',
 subtitle: isRtl ? 'زيت زيتون بكر' : 'Extra Virgin Olive Oil',
 metadata: { [isRtl ? 'الانتهاء' : 'Expiry']: '2025-12-31', [isRtl ? 'الكمية' : 'Qty']: '45' },
 link: `/inventory/lots/LOT-9942-A`,
 },
 {
 id: '4',
 type: 'supplier',
 title: isRtl ? 'البركة للخدمات' : 'Al-Baraka Logistics',
 subtitle: 'SUP-882',
 status: 'ACTIVE',
 metadata: { [isRtl ? 'التقييم' : 'Rating']: '4.8/5' },
 link: `/master-data/suppliers/SUP-882`,
 },
 ]);
 setIsLoading(false);
 }, 600);
 }

 return () => {
 if (loadingTimer) clearTimeout(loadingTimer);
 if (resultsTimer) clearTimeout(resultsTimer);
 };
 }, [query, isRtl, locale]);

 const handleSearch = (e: React.FormEvent) => {
 e.preventDefault();
 if (searchTerm.trim()) {
 const params = new URLSearchParams(searchParams);
 params.set('q', searchTerm);
 router.push(`?${params.toString()}`);
 }
 };

 const sections = [
 { id: 'item', title: t('sections.products'), icon: Package, color: 'text-operational-cyan' },
 { id: 'supplier', title: t('sections.suppliers'), icon: Truck, color: 'text-status-info' },
 { id: 'lot', title: t('sections.warehouse'), icon: Database, color: 'text-status-success' },
 { id: 'document', title: t('sections.transactions'), icon: FileText, color: 'text-status-warning' },
 ];

 return (
 <div className="min-h-screen bg-surface-container-lowest text-foreground p-4 lg:p-10 space-y-10 animate-in fade-in duration-700">
 
 {/* Header & Global Search */}
 <div className="max-w-[1400px] mx-auto space-y-8">
 <div className="flex flex-col md:flex-row items-center justify-between gap-6">
 <div className="flex flex-col gap-1 w-full md:w-auto">
 <h1 className="text-headline-lg font-semibold text-foreground">
 {t('title')}
 </h1>
 <div className="flex items-center gap-2">
 <span className="text-label-xs font-semibold text-muted-foreground/60/40 uppercase">
 {query 
 ? t('identified_matches', { count: results.length, query }) 
 : t('search_hint')}
 </span>
 <div className="h-px w-12 bg-operational-cyan/20" />
 </div>
 </div>
 
 <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-sm border border-surface-variant/10">
 <Command className="w-4 h-4 text-operational-cyan" />
 <span className="text-label-xs font-semibold uppercase text-muted-foreground/60">
 {t('shortcut_hint')}
 </span>
 </div>
 </div>

 <form onSubmit={handleSearch} className="group relative max-w-4xl mx-auto">
 <div className="absolute inset-y-0 start-0 ps-8 flex items-center pointer-events-none">
 <SearchIcon className="w-6 h-6 text-operational-cyan group-focus-within:scale-110 transition-transform" />
 </div>
 <Input
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder={t('placeholder')}
 className="h-24 ps-20 pe-40 rounded-3xl bg-surface-container-low border border-border-surface text-title-lg font-bold placeholder:text-muted-foreground/60/30 focus-visible:ring-4 focus-visible:ring-operational-cyan/10 transition-all outline-none"
 />
 <div className="absolute inset-y-0 end-0 pe-4 flex items-center">
 <Button type="submit" className="h-16 px-10 rounded-2xl bg-surface-ledger hover:bg-surface-ledger/90 text-white font-semibold text-body-md uppercase gap-3 transition-all hover:scale-[0.98] active:scale-95">
 {t('execute')}
 <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
 </Button>
 </div>
 </form>
 </div>

 {/* Main Grid: Filters & Results */}
 <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-8">
 
 {/* Filter Sidebar */}
 <div className="w-full lg:w-[320px] space-y-6">
 <Card className="p-8 rounded-3xl border-surface-variant/10 bg-surface-container-low/40">
 <div className="flex items-center justify-between mb-8">
 <div className="flex items-center gap-3">
 <Filter className="w-5 h-5 text-operational-cyan" />
 <h4 className="text-label-xs font-semibold uppercase">{t('refine')}</h4>
 </div>
 <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-surface-container-highest">
 <X className="w-4 h-4" />
 </Button>
 </div>

 <div className="space-y-8">
 <div className="space-y-4">
 <span className="text-label-xxs font-semibold text-muted-foreground/60/40 uppercase ps-1">{t('main_category')}</span>
 <div className="flex flex-col gap-2">
 {['All', 'Food', 'Packaging', 'Equipment'].map(c => (
 <button key={c} className="flex items-center justify-between px-5 py-3 rounded-xl bg-surface-container-low border border-surface-variant/10 hover:border-operational-cyan/30 transition-all group">
 <span className="text-label-xs font-semibold uppercase text-muted-foreground/60 group-hover:text-operational-cyan">{c}</span>
 <div className="w-1.5 h-1.5 rounded-full bg-operational-cyan/20 group-hover:bg-operational-cyan transition-colors" />
 </button>
 ))}
 </div>
 </div>

 <div className="space-y-4">
 <span className="text-label-xxs font-semibold text-muted-foreground/60/40 uppercase ps-1">{t('operational_status')}</span>
 <div className="flex flex-wrap gap-2">
 {['Active', 'Draft', 'Alert'].map(s => (
 <Badge key={s} className="bg-surface-container-low border border-surface-variant/10 text-label-xxs font-semibold uppercase px-3 py-1.5 rounded-lg cursor-pointer hover:bg-operational-cyan/10 hover:text-operational-cyan transition-all">
 {s}
 </Badge>
 ))}
 </div>
 </div>
 </div>
 </Card>

 <Card className="p-8 rounded-3xl border-surface-variant/10 bg-surface-container-low/40">
 <div className="flex items-center gap-3 mb-6">
 <Clock className="w-4 h-4 text-status-warning" />
 <h4 className="text-label-xs font-semibold uppercase">{t('recent_searches')}</h4>
 </div>
 <div className="space-y-3">
 {['Lot #992', 'Premium Rice', 'Supplier Al-Baraka'].map(s => (
 <div key={s} className="flex items-center justify-between text-label-xs font-semibold text-muted-foreground/60/40 hover:text-operational-cyan cursor-pointer transition-colors px-2 py-1">
 <span>{s}</span>
 <ChevronRight className={`w-3 h-3 ${isRtl ? 'rotate-180' : ''}`} />
 </div>
 ))}
 </div>
 </Card>
 </div>

 {/* Results categorized as sections */}
 <div className="flex-1 space-y-12">
 {isLoading ? (
 <div className="flex flex-col items-center justify-center py-40 gap-6">
 <div className="w-20 h-20 border-4 border-operational-cyan/10 border-t-operational-cyan rounded-full animate-spin" />
 <p className="text-label-xs font-semibold uppercase text-operational-cyan animate-pulse">
 {t('syncing')}
 </p>
 </div>
 ) : results.length > 0 ? (
 sections.map(section => {
 const sectionResults = results.filter(r => r.type === section.id);
 if (sectionResults.length === 0) return null;
 return (
 <div key={section.id} className="space-y-6">
 <div className="flex items-center gap-4 px-4">
 <div className={`w-10 h-10 rounded-2xl bg-surface-container-low flex items-center justify-center border border-surface-variant/10`}>
 <section.icon className={`w-5 h-5 ${section.color}`} />
 </div>
 <div className="flex flex-col gap-0.5">
 <h3 className="text-title-lg font-semibold text-foreground uppercase">{section.title}</h3>
 <span className="text-label-xxs font-semibold text-muted-foreground/60/40 uppercase">{sectionResults.length} {t('records')}</span>
 </div>
 <div className="flex-1 h-px bg-on-surface/5" />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
 {sectionResults.map(result => (
 <Link key={result.id} href={result.link} className="group flex flex-col p-8 rounded-3xl bg-surface-container-low/60 border border-surface-variant/10 hover:bg-surface-container-low hover:scale-[0.98] active:scale-95 transition-all duration-500 relative overflow-hidden">
 <div className="flex items-start justify-between mb-8">
 <div className="w-16 h-16 rounded-2xl bg-surface-container-highest flex items-center justify-center border border-surface-variant/10">
 {result.type === 'item' ? <Package className="w-7 h-7 text-operational-cyan/40" /> : <Database className="w-7 h-7 text-status-success/40" />}
 </div>
 {result.status && (
 <Badge className="bg-operational-cyan/10 text-operational-cyan border-none text-label-xxs font-semibold px-3 h-6 rounded-full uppercase">
 {result.status}
 </Badge>
 )}
 </div>

 <div className="space-y-1 mb-8">
 <h5 className="text-title-sm font-semibold group-hover:text-operational-cyan transition-colors uppercase">{result.title}</h5>
 <p className="text-label-xs font-semibold text-muted-foreground/60/40 uppercase">{result.subtitle}</p>
 </div>

 {result.metadata && (
 <div className="grid grid-cols-2 gap-4 pt-6 border-t border-surface-variant/10">
 {Object.entries(result.metadata).map(([k, v]) => (
 <div key={k}>
 <p className="text-label-xxs font-semibold text-muted-foreground/60/30 uppercase mb-1">{k}</p>
 <p className="text-label-xs font-semibold text-foreground">{v}</p>
 </div>
 ))}
 </div>
 )}
 </Link>
 ))}
 </div>
 </div>
 );
 })
 ) : query ? (
 <div className="flex flex-col items-center justify-center py-40 gap-8 text-center max-w-md mx-auto">
 <div className="w-24 h-24 rounded-3xl bg-surface-container-low flex items-center justify-center border border-border-surface">
 <AlertCircle className="w-10 h-10 text-status-error/20" />
 </div>
 <div className="space-y-2">
 <h3 className="text-headline-lg font-semibold text-foreground">{t('no_matches')}</h3>
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase leading-relaxed">
 {t('no_matches_desc', { query })}
 </p>
 </div>
 <Button variant="outline" onClick={() => setSearchTerm('')} className="h-12 px-8 rounded-sm border-surface-variant/10 bg-surface-container-low text-label-xs font-semibold uppercase hover:scale-[0.98] active:scale-95">
 {t('reset')}
 </Button>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-20">
 {[
 { title: t('tips.sku'), icon: Package, desc: t('tips.sku_desc') },
 { title: t('tips.transactions'), icon: FileText, desc: t('tips.transactions_desc') },
 { title: t('tips.suppliers'), icon: Truck, desc: t('tips.suppliers_desc') },
 ].map((tip, i) => (
 <div key={i} className="p-10 rounded-3xl bg-surface-container-low/40 border border-surface-variant/10 space-y-6 text-center hover:bg-surface-container-low transition-colors group">
 <div className="w-16 h-16 rounded-xl bg-surface-container-highest flex items-center justify-center mx-auto border border-border-surface group-hover:scale-110 transition-transform">
 <tip.icon className="w-8 h-8 text-operational-cyan/40" />
 </div>
 <div className="space-y-2">
 <h4 className="text-title-sm font-semibold uppercase text-foreground">{tip.title}</h4>
 <p className="text-label-xs font-semibold text-muted-foreground/60/40 uppercase leading-relaxed">{tip.desc}</p>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
