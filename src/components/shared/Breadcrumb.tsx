'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  const [isRtl, setIsRtl] = useState(true);
  
  useEffect(() => {
    setIsRtl(document.documentElement.dir === 'rtl');
  }, []);
  
  return (
    <nav className="flex items-center text-sm mb-4">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center">
            {item.href && !isLast ? (
              <Link href={item.href} className="text-on-surface-muted hover:text-on-surface transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-on-surface font-medium' : 'text-on-surface-muted'}>
                {item.label}
              </span>
            )}
            
            {!isLast && (
              <svg 
                className={`w-4 h-4 mx-2 text-surface-3 ${isRtl ? 'scale-x-[-1]' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        );
      })}
    </nav>
  );
}
