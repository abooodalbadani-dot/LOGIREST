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
           "flex min-h-[100px] w-full rounded-[var(--radius)] border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-surface-container-lowest shadow-sm px-4 py-3 text-body-md text-foreground transition-all duration-[140ms] ease-out outline-none placeholder:text-muted-foreground/50 hover:border-slate-400 dark:hover:border-slate-500 focus-visible:ring-[3px] focus-visible:ring-primary/25 focus-visible:border-primary focus-visible:shadow-md focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:bg-destructive/5",
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
