'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

export function FilterPanel({ children, onReset }: { children: React.ReactNode; onReset: () => void }) {
 const [isOpen, setIsOpen] = useState(false);
 const t = useTranslations('common');

 return (
 <div className="bg-surface-container-low rounded-sm mb-6 overflow-hidden">
 <button 
 onClick={() => setIsOpen(!isOpen)}
 className="w-full px-6 py-4 flex justify-between items-center text-foreground hover:bg-muted/30 transition-colors"
 >
 <span className="text-label-sm font-bold flex items-center gap-3 uppercase text-primary">
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
 </svg>
 {t('filters')}
 </span>
 <div className="flex items-center gap-2">
 <span className="text-label-xs font-bold text-muted-foreground uppercase opacity-60">
 {isOpen ? 'Collapse' : 'Expand'}
 </span>
 <svg 
 className={`w-3 h-3 transition-transform text-muted-foreground ${isOpen ? 'rotate-180' : ''}`} 
 fill="none" viewBox="0 0 24 24" stroke="currentColor"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
 </svg>
 </div>
 </button>
 
 {isOpen && (
 <div className="px-6 pb-6 pt-2">
 <div className="flex flex-wrap gap-x-8 gap-y-6">
 {children}
 </div>
 <div className="mt-8 flex justify-end">
 <button 
 onClick={onReset}
 className="px-5 py-2 bg-surface-container-highest text-foreground hover:bg-accent transition-colors rounded-sm text-label-xs font-semibold uppercase"
 >
 {t('reset')}
 </button>
 </div>
 </div>
 )}
 </div>
 );
}
