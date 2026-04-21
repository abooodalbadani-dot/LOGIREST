'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

export function FilterPanel({ children, onReset }: { children: React.ReactNode; onReset: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('common');

  return (
    <div className="bg-surface-1 border border-surface-3 rounded mb-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex justify-between items-center text-on-surface hover:bg-surface-2 transition-colors rounded"
      >
        <span className="font-bold flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {t('filters') || 'Filters'}
        </span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="p-4 border-t border-surface-3 border-dashed">
          <div className="flex flex-wrap gap-4">
            {children}
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              onClick={onReset}
              className="px-4 py-2 bg-surface-3 text-on-surface hover:bg-surface-4 transition-colors rounded text-sm font-medium"
            >
              {t('reset') || 'Reset'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
