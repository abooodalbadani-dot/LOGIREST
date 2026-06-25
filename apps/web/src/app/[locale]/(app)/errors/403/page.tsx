'use client';

import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AccessDeniedPage() {
 const router = useRouter();
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
  setMounted(true);
 }, []);

 if (!mounted) {
  return null;
 }

 return (
  <div className="min-w-0 items-center flex-1 gap-6 p-8 justify-center flex-col flex min-h-screen bg-surface-container w-full">
   <div className="max-w-lg w-full bg-card border border-border shadow-sm rounded-[3rem] border border-red-500/20 p-12 text-center space-y-8 ambient-shadow">
    <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mx-auto border-2 border-red-500/20">
     <ShieldAlert className="w-12 h-12 text-red-500/70" />
    </div>

    <div className="space-y-3">
     <h1 className="text-display-sm font-bold text-foreground tracking-tight">
      403
     </h1>
     <h2 className="text-title-md font-semibold text-foreground/80">
      Access Denied
     </h2>
     <p className="text-body-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
      You do not have permission to access this resource.
      If you believe this is an error, please contact your system administrator.
     </p>
    </div>

    <div className="flex items-center justify-center gap-4">
     <button
      onClick={() => router.back()}
      className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
     >
      <ArrowLeft className="w-4 h-4" />
      Go Back
     </button>
     <Link
      href="/dashboard"
      className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-surface-container-high hover:bg-surface-container-highest transition-all text-label-sm font-semibold uppercase text-muted-foreground"
     >
      Dashboard
     </Link>
    </div>

    <div className="pt-4 border-t border-outline-low/50">
     <p className="text-label-xs text-muted-foreground/50 uppercase tracking-wider">
      LogiRest — Operational Nocturne
     </p>
    </div>
   </div>
  </div>
 );
}
