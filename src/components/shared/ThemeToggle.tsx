'use client';

import { useTheme } from '@/providers/ThemeProvider';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
 const { theme, toggleTheme, mounted } = useTheme();
 
 if (!mounted) {
 return (
 <div className="w-9 h-9 rounded-xl bg-surface-container-low animate-pulse" />
 );
 }

 return (
 <button
 onClick={toggleTheme}
 className="p-2 text-muted-foreground/60 hover:text-operational-cyan hover:bg-operational-cyan/10 rounded-xl transition-all group relative overflow-hidden"
 aria-label="Toggle Theme"
 >
 {/* Subtle glow effect */}
 <div className="absolute inset-0 bg-operational-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity" />
 
 <div className="relative z-10">
 {theme === 'dark' ? (
 <Sun className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
 ) : (
 <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform duration-500" />
 )}
 </div>
 </button>
 );
}
