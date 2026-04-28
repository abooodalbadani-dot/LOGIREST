import Image from 'next/image';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  imageUrl?: string;
  className?: string;
  icon?: React.ElementType;
}

export function EmptyState({
  title,
  description,
  action,
  imageUrl = '/empty_state_nocturne.png', // Default generated image
  className,
  icon: Icon
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in duration-700",
      className
    )}>
      {Icon ? (
        <div className="w-16 h-16 mb-8 text-muted-foreground/20">
          <Icon className="w-full h-full" />
        </div>
      ) : (
        <div className="relative w-64 h-64 mb-8 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-1000">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-contain"
            priority
          />
          {/* Cinematic Glow Background */}
          <div className="absolute inset-0 bg-operational-cyan/5 blur-[80px] rounded-full -z-10" />
        </div>
      )}

      <div className="max-w-md space-y-4">
        <h3 className="text-xl font-display font-bold tracking-tight text-foreground/90 uppercase italic">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground/60 font-medium leading-relaxed">
          {description}
        </p>
        
        {action && (
          <div className="pt-6">
            {action}
          </div>
        )}
      </div>

      {/* Blueprint lines decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-20 opacity-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[1px] bg-operational-cyan/20 rotate-12" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[1px] bg-operational-cyan/20 -rotate-12" />
      </div>
    </div>
  );
}
