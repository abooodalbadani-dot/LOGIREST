'use client';

import React from 'react';
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
        console.log('⚡ Registered WebMCP Tools:', registeredTools);
        console.table(registeredTools.map(t => ({ Name: t.name, Description: t.description })));
      }}
      className="flex items-center gap-2 px-5 py-2 rounded-full bg-slate-950/90 backdrop-blur-3xl border border-fuchsia-500/50 group transition-all relative overflow-hidden shadow-[0_0_30px_-5px_rgba(217,70,239,0.5),0_0_15px_-5px_rgba(168,85,247,0.4)] hover:shadow-[0_0_50px_-5px_rgba(217,70,239,0.8),0_0_30px_-5px_rgba(168,85,247,0.6)] hover:border-fuchsia-400 hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-fuchsia-500/20"
      title="WebMCP AI Tools Enabled"
      type="button"
    >
      {/* Hyper-Neon Ambient Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600/40 via-purple-600/40 to-pink-600/40 opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
      
      {/* Animated Scanning Light */}
      <div className="absolute -inset-[100%] bg-[conic-gradient(from_0deg,transparent_0,rgba(217,70,239,0.2)_0.1,transparent_0.2)] animate-[spin_3s_linear_infinite] group-hover:animate-[spin_1.5s_linear_infinite]" />
      
      <div className="relative flex items-center gap-2.5">
        <div className="flex items-center justify-center">
          <Zap className="w-4 h-4 text-fuchsia-400 fill-fuchsia-400/30 group-hover:text-fuchsia-200 group-hover:scale-125 transition-all duration-300 drop-shadow-[0_0_10px_rgba(217,70,239,1)]" />
        </div>
        
        <span className="text-[11px] font-black tracking-[0.1em] uppercase flex items-center gap-1.5 select-none">
          <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">⚡ WebMCP</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-fuchsia-300 to-pink-400 font-extrabold drop-shadow-[0_0_12px_rgba(217,70,239,0.6)]">Enabled</span>
        </span>
      </div>
      
      {/* Precision Bottom Border Glow */}
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent opacity-80 group-hover:opacity-100 blur-[1.5px] transition-opacity" />
      
      {/* Corner Highlights */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-fuchsia-300/60 rounded-tl-sm group-hover:border-fuchsia-200" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-fuchsia-300/60 rounded-tr-sm group-hover:border-fuchsia-200" />
    </button>
  );
}

export default WebMCPBadge;
