'use client';

import * as React from 'react';

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number }
>(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    className={`relative h-2 w-full overflow-hidden rounded-full bg-surface-container-high ${className || ''}`}
    {...props}
  >
    <div
      className="h-full w-full flex-1 bg-operational-cyan transition-all duration-300 ease-in-out origin-inline-start"
      style={{ transform: `scaleX(${(value || 0) / 100})` }}
    />
  </div>
));
Progress.displayName = 'Progress';

export { Progress };
