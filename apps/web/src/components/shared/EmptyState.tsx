import Image from 'next/image';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  imageUrl?: string;
  className?: string;
  icon?: React.ElementType;
  variant?: 'full' | 'minimal';
}

export function EmptyState({
  title,
  description,
  action,
  imageUrl = '/empty_state_nocturne.png',
  className,
  icon: Icon,
  variant = 'full'
}: EmptyStateProps) {
  const isMinimal = variant === 'minimal';
  const EffectiveIcon = Icon || (isMinimal ? PackageOpen : null);

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center animate-in fade-in duration-200 w-full relative",
      isMinimal ? "py-32 px-4 gap-6 opacity-20" : "py-20 px-6 gap-8",
      className
    )}>
      {EffectiveIcon ? (
        <div className={cn(
          "text-muted-foreground/60 transition-colors duration-200",
          isMinimal ? "w-12 h-12" : "w-16 h-16 mb-2"
        )}>
          <EffectiveIcon className="w-full h-full" strokeWidth={1} />
        </div>
      ) : !isMinimal && (
        <div className="relative w-64 h-64 mb-4 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-200">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-contain"
            priority
          />
          <div className="absolute inset-0 bg-operational-cyan/5 blur-[80px] rounded-full -z-10" />
        </div>
      )}

      <div className={cn(
        "flex flex-col items-center",
        isMinimal ? "max-w-md space-y-1" : "max-w-lg space-y-4"
      )}>
        <h3 className={cn(
          "font-semibold tracking-widest whitespace-nowrap",
          isMinimal ? "text-label-xs uppercase text-muted-foreground/60" : "text-title-lg uppercase text-foreground/90"
        )}>
          {title}
        </h3>
        {description && (
          <p className={cn(
            "text-muted-foreground/60 font-medium leading-relaxed",
            isMinimal ? "text-label-xs" : "text-body-md"
          )}>
            {description}
          </p>
        )}
        
        {action && (
          <div className={isMinimal ? "pt-2" : "pt-6"}>
            {action}
          </div>
        )}
      </div>

      {!isMinimal && (
        <div className="absolute top-0 start-0 w-full h-full pointer-events-none overflow-hidden -z-20 opacity-10">
          <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[1px] bg-operational-cyan/20 rotate-12" />
          <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[1px] bg-operational-cyan/20 -rotate-12" />
        </div>
      )}
    </div>
  );
}
