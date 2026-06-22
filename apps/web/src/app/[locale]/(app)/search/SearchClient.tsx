'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { apiClient } from '@/infrastructure/api/client';
import { z } from 'zod';
import { 
 Search as SearchIcon, 
 Package, 
 FileText, 
 Database, 
 Truck, 
 Clock, 
 ArrowRight,
 Filter,
 ChevronRight,
 Command,
 X,
 AlertCircle
} from 'lucide-react';
import { useCategories } from '@/features/categories/hooks/useCategories';

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

const SearchResultSchema = z.object({
 id: z.string(),
 type: z.enum(['item', 'document', 'lot', 'supplier']),
 title: z.string(),
 subtitle: z.string(),
 status: z.string().optional(),
 metadata: z.record(z.string(), z.string()).optional(),
 image: z.string().optional(),
 link: z.string(),
});
const SearchResultsArraySchema = z.array(SearchResultSchema);

export default function SearchClient() {
 const locale = useLocale() as 'ar' | 'en';
 const isRtl = locale === 'ar';
 const searchParams = useSearchParams();
 const router = useRouter();
 const query = searchParams.get('q') || '';
 const [searchTerm, setSearchTerm] = useState(query);
 const [isLoading, setIsLoading] = useState(false);
 
 const [activeCategory, setActiveCategory] = useState('ALL');
 const [activeStatus, setActiveStatus] = useState('ACTIVE');
 
 const t = useTranslations('operational.search');
 const tc = useTranslations('common');

 const { data: categoriesResult, isLoading: isCategoriesLoading } = useCategories();
 const dbCategories = categoriesResult?.data || [];

 const [results, setResults] = useState<SearchResult[]>([]);

 useEffect(() => {
  if (!query) {
   setResults([]);
   return;
  }

  const controller = new AbortController();
  setIsLoading(true);

  let url = `/search?q=${encodeURIComponent(query)}`;
  if (activeCategory !== 'ALL') url += `&category=${encodeURIComponent(activeCategory)}`;
  if (activeStatus !== 'ALL') url += `&status=${encodeURIComponent(activeStatus)}`;

  apiClient
   .get(url, SearchResultsArraySchema, {
    signal: controller.signal,
   })
   .then((data) => {
    setResults(data);
    setIsLoading(false);
   })
   .catch((err) => {
    if (err.name === 'AbortError') return;
    console.error(err);
    setIsLoading(false);
   });

  return () => {
   controller.abort();
  };
 }, [query, activeCategory, activeStatus]);

 const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();
  if (searchTerm.trim()) {
   const params = new URLSearchParams(searchParams);
   params.set('q', searchTerm);
   router.push(`?${params.toString()}`);
  }
 };

 const sections = [
  { id: 'item', title: t('sections.products') || 'PRODUCTS', icon: Package, color: 'text-[#CAAE85]' },
  { id: 'supplier', title: t('sections.suppliers') || 'SUPPLIERS', icon: Truck, color: 'text-blue-400' },
  { id: 'lot', title: t('sections.warehouse') || 'WAREHOUSE', icon: Database, color: 'text-green-400' },
  { id: 'document', title: t('sections.transactions') || 'TRANSACTIONS', icon: FileText, color: 'text-orange-400' },
 ];

 return (
  <div className="flex flex-col min-h-screen w-full bg-gray-50 dark:bg-[#0B1220] md:bg-white md:dark:bg-[#0B1220] text-[#0B1220] dark:text-white selection:bg-[#CAAE85]/30">
   <div className="max-w-[1400px] mx-auto w-full pt-12 pb-8 px-6 lg:px-12">
    
    {/* Header & Global Search */}
    <div className="flex flex-col mb-16">
     <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[#0B1220] dark:text-white mb-2">
      {t('title') || 'Universal Search'}
     </h1>
     <div className="flex items-center gap-4">
      <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
       {t('search_hint') || 'SEARCH ACROSS ITEMS, SUPPLIERS, OR DOCUMENTS'}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-gray-800 to-transparent" />
     </div>
    </div>
    
    <div className="flex justify-center mb-6">
     <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-white dark:bg-[#121A2F] border border-gray-200 dark:border-gray-800 shadow-sm">
      <Command className="w-3.5 h-3.5 text-[#CAAE85]" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
       {t('shortcut_hint') || 'PRESS / FOR FAST SEARCH'}
      </span>
     </div>
    </div>

    <form onSubmit={handleSearch} className="group relative max-w-4xl mx-auto w-full mb-12">
     <div className="absolute inset-y-0 start-0 ps-5 flex items-center pointer-events-none">
      <SearchIcon className="w-4 h-4 text-gray-500" />
     </div>
     <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder={t('placeholder') || 'Find item, supplier, lot, or document...'}
      className="h-14 w-full ps-12 pe-40 rounded-2xl bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 shadow-lg text-sm font-bold text-[#0B1220] dark:text-white placeholder:text-gray-500 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all outline-none"
     />
     <div className="absolute inset-y-0 end-0 pe-2 flex items-center">
      <button type="submit" className="h-10 px-5 rounded-xl bg-[#0B1220] dark:bg-white text-white dark:text-[#0B1220] hover:bg-gray-800 dark:hover:bg-gray-100 font-bold text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm">
       {t('execute') || 'EXECUTE SEARCH'}
       <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
      </button>
     </div>
    </form>

    {/* Main Grid: Filters & Results */}
    <div className="flex flex-col lg:flex-row gap-8 w-full min-w-0">
     
     {/* Filter Sidebar */}
     <div className="w-full lg:w-[320px] space-y-6 shrink-0">
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 shadow-xl">
       <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
         <Filter className="w-4 h-4 text-[#CAAE85]" />
         <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#0B1220] dark:text-white">{t('refine') || 'REFINE RESULTS'}</h4>
        </div>
        <button type="button" className="text-gray-500 hover:text-white transition-colors">
         <X className="w-4 h-4" />
        </button>
       </div>

       <div className="space-y-8">
        <div className="space-y-4">
         <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('main_category') || 'MAIN CATEGORY'}</span>
          <div className="flex flex-col gap-2">
           <button onClick={() => setActiveCategory('ALL')} className={`flex items-center justify-between px-5 py-4 rounded-2xl bg-gray-50 dark:bg-[#0B1220] border ${'ALL' === activeCategory ? 'border-[#CAAE85]' : 'border-gray-200 dark:border-gray-800 hover:border-[#D4AF37]'} transition-colors group`}>
            <span className={`text-xs font-bold uppercase transition-colors ${'ALL' === activeCategory ? 'text-[#0B1220] dark:text-white' : 'text-gray-800 dark:text-gray-400 group-hover:text-[#0B1220] dark:group-hover:text-white'}`}>ALL</span>
            <div className={`w-2 h-2 rounded-full transition-colors ${'ALL' === activeCategory ? 'bg-[#CAAE85]' : 'bg-gray-300 dark:bg-gray-700 group-hover:bg-[#CAAE85]/50'}`} />
           </button>
           
           {isCategoriesLoading ? (
            <>
             <div className="h-12 w-full bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg border border-gray-100 dark:border-gray-800"></div>
             <div className="h-12 w-full bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg border border-gray-100 dark:border-gray-800"></div>
             <div className="h-12 w-full bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg border border-gray-100 dark:border-gray-800"></div>
            </>
           ) : (
            dbCategories.map((category) => {
             const isActive = category.id === activeCategory;
             return (
              <button key={category.id} onClick={() => setActiveCategory(category.id)} className={`flex items-center justify-between px-5 py-4 rounded-2xl bg-gray-50 dark:bg-[#0B1220] border ${isActive ? 'border-[#CAAE85]' : 'border-gray-200 dark:border-gray-800 hover:border-[#D4AF37]'} transition-colors group`}>
               <span className={`text-xs font-bold uppercase transition-colors ${isActive ? 'text-[#0B1220] dark:text-white' : 'text-gray-800 dark:text-gray-400 group-hover:text-[#0B1220] dark:group-hover:text-white'}`}>{category.name}</span>
               <div className={`w-2 h-2 rounded-full transition-colors ${isActive ? 'bg-[#CAAE85]' : 'bg-gray-300 dark:bg-gray-700 group-hover:bg-[#CAAE85]/50'}`} />
              </button>
             );
            })
           )}
          </div>
        </div>

        <div className="space-y-4">
         <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('operational_status') || 'OPERATIONAL STATUS'}</span>
         <div className="flex flex-wrap gap-2">
          {['ACTIVE', 'DRAFT', 'ALERT'].map((s) => {
           const isActive = s === activeStatus;
           return (
            <button key={s} onClick={() => setActiveStatus(s)} className={`bg-transparent text-[10px] font-bold uppercase px-2 py-1 transition-colors ${isActive ? 'text-[#0B1220] dark:text-white' : 'text-gray-500 hover:text-[#0B1220] dark:hover:text-white'}`}>
             {s}
            </button>
           );
          })}
         </div>
        </div>
       </div>
      </div>

      {/* Recent Searches */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 shadow-xl">
       <div className="flex items-center gap-3 mb-6">
        <Clock className="w-4 h-4 text-[#CAAE85]" />
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#0B1220] dark:text-white">{t('recent_searches') || 'RECENT SEARCHES'}</h4>
       </div>
       <div className="space-y-3">
        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
         {t('no_recent_searches') || 'No recent searches found'}
        </p>
       </div>
      </div>
     </div>

     {/* Results categorized as sections */}
     <div className="flex-1 space-y-12 min-w-0">
      {isLoading ? (
       <div className="flex flex-col items-center justify-center py-32 gap-6">
        <div className="w-16 h-16 border-2 border-[#CAAE85]/20 border-t-[#CAAE85] rounded-full animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#CAAE85] animate-pulse">
         {t('syncing') || 'SYNCING DATABASE...'}
        </p>
       </div>
      ) : results.length > 0 ? (
       sections.map(section => {
        const sectionResults = results.filter(r => r.type === section.id);
        if (sectionResults.length === 0) return null;
        return (
         <div key={section.id} className="space-y-6">
          <div className="flex items-center gap-4 px-2">
           <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 flex items-center justify-center">
            <section.icon className={`w-4 h-4 ${section.color}`} />
           </div>
           <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-bold text-[#0B1220] dark:text-white uppercase tracking-wider">{section.title}</h3>
            <span className="text-[10px] font-bold text-[#CAAE85] uppercase tracking-widest">{sectionResults.length} {t('records') || 'RECORDS'}</span>
           </div>
           <div className="flex-1 h-px bg-gradient-to-r from-gray-800 to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
           {sectionResults.map(result => (
            <Link key={result.id} href={result.link} className="group flex flex-col p-6 rounded-2xl bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-2xl hover:scale-[0.98] active:scale-95 transition-all duration-300 relative overflow-hidden">
             <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-[#0B1220] flex items-center justify-center border border-gray-200 dark:border-gray-800 group-hover:border-[#CAAE85]/30 transition-colors">
               {result.type === 'item' ? <Package className="w-5 h-5 text-[#CAAE85]" /> : <Database className="w-5 h-5 text-gray-400" />}
              </div>
              {result.status && (
               <div className="bg-gray-50 dark:bg-[#0B1220] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 text-[9px] font-bold px-3 py-1.5 rounded-md uppercase tracking-widest">
                {result.status}
               </div>
              )}
             </div>

             <div className="space-y-1 mb-6 flex-1">
              <h5 className="text-sm font-bold text-[#0B1220] dark:text-white group-hover:text-[#CAAE85] transition-colors">{result.title}</h5>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{result.subtitle}</p>
             </div>

             {result.metadata && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
               {Object.entries(result.metadata).map(([k, v]) => (
                <div key={k}>
                 <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">{k}</p>
                 <p className="text-xs font-bold text-[#0B1220] dark:text-white truncate">{v}</p>
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
       <div className="flex flex-col items-center justify-center py-32 gap-6 text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-2xl bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 flex items-center justify-center">
         <AlertCircle className="w-8 h-8 text-red-500/50" />
        </div>
        <div className="space-y-2">
         <h3 className="text-lg font-bold text-[#0B1220] dark:text-white">{t('no_matches') || 'NO MATCHES FOUND'}</h3>
         <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
          {t('no_matches_desc', { query }) || `We couldn't find anything matching "${query}".`}
         </p>
        </div>
        <button type="button" onClick={() => setSearchTerm('')} className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-800 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest hover:text-[#0B1220] dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-600 transition-colors mt-4">
         {t('reset') || 'RESET SEARCH'}
        </button>
       </div>
      ) : (
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12">
        {[
         { title: t('tips.sku') || 'SKU & BARCODES', icon: Package, desc: t('tips.sku_desc') || 'Scan or type exactly.' },
         { title: t('tips.transactions') || 'TRANSACTIONS', icon: FileText, desc: t('tips.transactions_desc') || 'Search POs, GRNs, or Adjustments.' },
         { title: t('tips.suppliers') || 'SUPPLIERS', icon: Truck, desc: t('tips.suppliers_desc') || 'Find vendors by name or code.' },
        ].map((tip, i) => (
         <div key={i} className="p-8 rounded-2xl bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 space-y-4 text-center hover:border-gray-300 dark:hover:border-gray-700 transition-colors group">
          <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-[#0B1220] border border-gray-200 dark:border-gray-800 flex items-center justify-center mx-auto group-hover:border-[#CAAE85]/50 transition-colors">
           <tip.icon className="w-5 h-5 text-gray-500 group-hover:text-[#CAAE85] transition-colors" />
          </div>
          <div className="space-y-1">
           <h4 className="text-[10px] font-bold text-[#0B1220] dark:text-white uppercase tracking-widest">{tip.title}</h4>
           <p className="text-[10px] font-medium text-gray-500">{tip.desc}</p>
          </div>
         </div>
        ))}
       </div>
      )}
     </div>
    </div>
   </div>
  </div>
 );
}
