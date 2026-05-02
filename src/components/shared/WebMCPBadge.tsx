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
 alert(`WebMCP Discovery Mode:\n ${registeredTools.map(t => `• ${t.name}`).join('\n')}`);
 }}
 className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-fuchsia-500/30 group transition-all relative overflow-hidden shadow-[0_0_15px_rgba(217,70,239,0.3)] hover:shadow-[0_0_25px_rgba(217,70,239,0.5)]"
 type="button"
 >
 {/* Dynamic Glowing Background */}
 <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600/20 via-purple-600/20 to-pink-600/20 opacity-60 group-hover:opacity-100 transition-opacity animate-pulse" />
 
 <div className="relative flex items-center gap-2.5">
 <div className="relative">
 <Zap className="w-4 h-4 text-fuchsia-400 fill-fuchsia-400 group-hover:scale-125 transition-transform duration-500 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
 <div className="absolute inset-0 blur-[4px] bg-fuchsia-400/40 rounded-full animate-ping opacity-20" />
 </div>
 <div className="flex flex-col items-start leading-none">
 <span className="text-label-xxs font-semibold text-fuchsia-300 uppercase mb-0.5 drop-shadow-sm">
 Discovery Active
 </span>
 <span className="text-label-xs font-semibold text-white uppercase flex items-center gap-1">
 <span className="text-fuchsia-400">⚡</span> WebMCP
 </span>
 </div>
 </div>
 </button>

 );
}

export default WebMCPBadge;

