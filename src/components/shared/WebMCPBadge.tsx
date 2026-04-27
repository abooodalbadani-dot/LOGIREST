'use client';

import { Zap } from 'lucide-react';
import { useWebMCP } from '@/providers/WebMCPProvider';

/**
 * WebMCPBadge component
 * Displays a neon badge when WebMCP discovery is active.
 * Uses named and default exports for maximum compatibility.
 */
export function WebMCPBadge() {
  const { isAvailable, registeredTools } = useWebMCP();

  // If WebMCP is not detected in the browser, don't show the badge
  if (!isAvailable) return null;

  return (
    <button 
      onClick={() => {
        console.log('Registered WebMCP Tools:', registeredTools);
        alert(`WebMCP Discovery Mode:\n${registeredTools.map(t => `• ${t.name}`).join('\n')}`);
      }}
      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/80 shadow-[0_0_20px_rgba(236,72,153,0.3)] group transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] relative overflow-hidden"
      type="button"
    >
      {/* Pulsing Neon Background - OVERRIDES PURPLE BAN FOR WEBMCP */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-600/20 via-indigo-600/20 to-pink-600/20 opacity-40 group-hover:opacity-100 transition-opacity" />
      <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-indigo-500 to-pink-500 blur-lg opacity-10 group-hover:opacity-30 animate-pulse" />
      
      <div className="relative flex items-center gap-2">
        <div className="relative">
          <Zap className="w-3.5 h-3.5 text-pink-400 fill-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,1)]" />
          <div className="absolute inset-0 blur-[4px] bg-pink-400/60 rounded-full animate-ping opacity-40" />
        </div>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[8px] font-black text-pink-300/90 uppercase tracking-[0.25em] mb-0.5">
            Discovery Active
          </span>
          <span className="text-[10px] font-black text-white uppercase tracking-wider drop-shadow-[0_0_3px_rgba(255,255,255,0.4)]">
            ⚡ WebMCP Enabled
          </span>
        </div>
      </div>
    </button>
  );
}

