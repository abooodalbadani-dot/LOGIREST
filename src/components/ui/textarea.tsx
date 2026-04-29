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
          "flex min-h-[100px] w-full rounded-[var(--radius)] border-none bg-surface-container-highest px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:bg-primary-fixed-dim/10 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-[140ms] ease-out",
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
