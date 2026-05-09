'use client';
import { Link } from '@/i18n/navigation';
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
 
 return (
 <nav className="flex items-center text-body-md mb-4">
 {items.map((item, index) => {
 const isLast = index === items.length - 1;
 
 return (
 <div key={index} className="flex items-center">
 {item.href && !isLast ? (
 <Link href={item.href} className="text-muted-foreground/60 hover:text-foreground transition-colors">
 {item.label}
 </Link>
 ) : (
 <span className={isLast ? 'text-foreground font-medium' : 'text-muted-foreground/60'}>
 {item.label}
 </span>
 )}
 
 {!isLast && (
 <span className="rtl:rotate-180 inline-block">
 <svg 
 className="w-4 h-4 mx-2 text-surface-container-highest" 
 fill="none" 
 viewBox="0 0 24 24" 
 stroke="currentColor"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
 </svg>
 </span>
 )}
 </div>
 );
 })}
 </nav>
 );
}
