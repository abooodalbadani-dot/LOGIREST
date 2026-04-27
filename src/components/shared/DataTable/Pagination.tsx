import { useTranslations } from 'next-intl';

interface PaginationProps {
  page: number; 
  totalPages: number; 
  onPageChange: (p: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <div className="flex gap-2 items-center text-sm font-medium">
      <button 
        onClick={() => onPageChange(page - 1)}
        disabled={isFirst}
        className="p-2 bg-surface-2 rounded border border-surface-3 disabled:opacity-50 hover:bg-surface-3 transition-colors"
      >
        <svg 
          className="w-4 h-4 rtl:scale-x-[-1]" 
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <span className="px-3 py-1 bg-surface-1 rounded border border-surface-3 text-on-surface">
        <span dir="ltr">{page}</span> / <span dir="ltr">{totalPages}</span>
      </span>

      <button 
        onClick={() => onPageChange(page + 1)}
        disabled={isLast}
        className="p-2 bg-surface-2 rounded border border-surface-3 disabled:opacity-50 hover:bg-surface-3 transition-colors"
      >
        <svg 
          className="w-4 h-4 rtl:scale-x-[-1]" 
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
