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
          "flex min-h-[100px] w-full rounded-[var(--radius)] border border-input bg-white dark:bg-surface-container-lowest px-4 py-3 text-body-md transition-all duration-[140ms] ease-out outline-none placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:bg-destructive/10",
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
