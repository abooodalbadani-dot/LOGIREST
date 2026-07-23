'use client';
import { Link } from '@/i18n/navigation';
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {

    return (
        <nav className="flex items-center text-xs sm:text-body-md mb-2 min-w-0 max-w-full overflow-hidden flex-wrap gap-y-1">
            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <div key={index} className="flex items-center min-w-0 max-w-full">
                        {item.href && !isLast ? (
                            <Link href={item.href} className="text-muted-foreground/60 hover:text-foreground transition-colors shrink-0 whitespace-nowrap">
                                {item.label}
                            </Link>
                        ) : (
                            <span className={isLast ? 'text-foreground font-medium truncate max-w-[200px] sm:max-w-md md:max-w-full' : 'text-muted-foreground/60 shrink-0 whitespace-nowrap'}>
                                {item.label}
                            </span>
                        )}

                        {!isLast && (
                            <span className="rtl:rotate-180 inline-block shrink-0">
                                <svg
                                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 mx-1 sm:mx-2 text-muted-foreground/40"
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
