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
      "flex min-h-[100px] w-full rounded-md bg-transparent dark:bg-[#121212] border border-border px-4 py-3 text-sm text-text-main dark:text-white shadow-sm transition-colors duration-200 outline-none placeholder:text-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:focus:ring-red-500",
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
