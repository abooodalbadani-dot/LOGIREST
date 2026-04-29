import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number; 
  totalPages: number; 
  onPageChange: (p: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <div className="flex gap-1.5 items-center">
      <button 
        onClick={() => onPageChange(page - 1)}
        disabled={isFirst}
        className="p-2 bg-surface-container-low hover:bg-surface-container text-foreground disabled:opacity-30 disabled:pointer-events-none rounded-xl transition-all border-none shadow-sm group active:scale-95"
        aria-label="Previous Page"
      >
        <ChevronLeft className="w-4 h-4 rtl:rotate-180 group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5 transition-transform" />
      </button>
      
      <div className="h-9 px-4 flex items-center bg-surface-container-lowest/50 border border-border-muted backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-[0.15em] text-operational-cyan shadow-inner">
        <span dir="ltr">{page}</span>
        <span className="mx-2 text-muted-foreground/30 font-light text-[8px]">/</span>
        <span className="text-muted-foreground/60" dir="ltr">{totalPages || 1}</span>
      </div>

      <button 
        onClick={() => onPageChange(page + 1)}
        disabled={isLast}
        className="p-2 bg-surface-container-low hover:bg-surface-container text-foreground disabled:opacity-30 disabled:pointer-events-none rounded-xl transition-all border-none shadow-sm group active:scale-95"
        aria-label="Next Page"
      >
        <ChevronRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
}
