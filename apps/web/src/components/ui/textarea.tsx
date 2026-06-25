import * as React from 'react';
import { cn } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TextareaProps
 extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
 ({ className, ...props }, ref) => {
 return (
 <textarea
     className={cn(
       "flex min-h-[100px] w-full rounded-md bg-background/50 border border-brand-gold/40 hover:border-brand-gold/70 px-4 py-3 text-sm text-text-main dark:text-white shadow-sm transition-colors duration-200 outline-none placeholder:text-gray-400 dark:placeholder-gray-500 focus-visible:outline-none focus-visible:border-brand-gold focus-visible:ring-1 focus-visible:ring-brand-gold/50 backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:focus:ring-red-500",
       "dark:text-foreground",
      className
     )}
 ref={ref}
 {...props}
 />
 );
 }
);
Textarea.displayName = 'Textarea';

export { Textarea };
