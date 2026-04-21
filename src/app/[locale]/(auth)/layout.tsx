import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 relative overflow-hidden">
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-primary/5 blur-[160px] rounded-full" />
        <div className="absolute -top-[10%] -right-[10%] w-[500px] h-[500px] bg-neon-cyan/5 blur-[120px] rounded-full" />
      </div>

      {/* Auth Container */}
      <div className="w-full max-w-md relative z-10 px-4">
        {children}
      </div>
    </div>
  );
}
