'use client';

import Image from 'next/image';

interface LoadingSpinnerProps {
    message?: string;
    subtitle?: string;
}

export default function LoadingSpinner({
    message = 'INITIALIZING_CORE_SYSTEMS',
    subtitle = 'نظام حوكمة وإدارة التموين والمطابخ'
}: LoadingSpinnerProps) {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center w-full min-h-[100dvh] bg-[#06070a] text-[#f1f5f9] font-sans antialiased p-4 sm:p-6 select-none overflow-hidden dir-rtl">
            {/* Ambient Luxury Background Lights */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-[#CAAE85]/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] bg-[#CAAE85]/15 blur-[80px] rounded-full pointer-events-none" />

            {/* Geometric Subtle Background Grid Pattern */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(#CAAE85 1.5px, transparent 1.5px)`,
                    backgroundSize: '36px 36px'
                }}
            />

            {/* Central Glassmorphic Luxury Card (Fixed Responsive Width) */}
            <div className="relative z-10 flex flex-col items-center text-center w-[92vw] sm:w-[480px] md:w-[520px] backdrop-blur-2xl bg-[#06070a]/85 border border-[#CAAE85]/30 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.95),0_0_60px_rgba(202,174,133,0.15)] rounded-[2.5rem] px-6 py-10 md:px-10 md:py-12 transition-all">

                {/* Logo & Circular Orbital Rings */}
                <div className="relative flex items-center justify-center w-32 h-32 md:w-36 md:h-36 mb-6">
                    {/* Outer Glowing Orbital Ring (Perfect Circle) */}
                    <div className="absolute inset-0 rounded-full border border-[#CAAE85]/25 shadow-[0_0_20px_rgba(202,174,133,0.1)] animate-[spin_12s_linear_infinite]" />
                    {/* Inner Reverse Orbital Ring with Accent Dots */}
                    <div className="absolute inset-2 rounded-full border border-[#CAAE85]/40 border-t-transparent border-b-transparent animate-[spin_8s_linear_infinite_reverse]" />

                    {/* Central Gold Emblem Box */}
                    <div className="relative flex items-center justify-center w-20 h-20 md:w-22 md:h-22 rounded-2xl bg-gradient-to-b from-[#05070c] via-[#06070a] to-[#06070a] border border-[#CAAE85]/60 shadow-[0_0_35px_rgba(202,174,133,0.3)] p-4 overflow-hidden">
                        {/* Inner Shimmer overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#CAAE85]/10 via-transparent to-[#CAAE85]/5 opacity-80" />
                        <Image
                            src="/logoicon.svg"
                            alt="Otantik Logo"
                            width={64}
                            height={64}
                            className="w-12 h-12 md:w-14 md:h-14 object-contain relative z-10 filter drop-shadow-[0_4px_16px_rgba(202,174,133,0.5)]"
                            priority
                        />
                    </div>
                </div>

                {/* Brand Titles */}
                <div className="flex flex-col items-center gap-1 mb-6 w-full">
                    <span className="text-sm md:text-2xl font-semibold tracking-[0.2em] text-[#CAAE85] uppercase whitespace-nowrap">
                        مطاعم أوتانتك
                    </span>
                    <h1 dir="ltr" className="text-2xl sm:text-3xl md:text-3xl font-extrabold tracking-[0.25em] bg-gradient-to-r from-[#FAECD9] via-[#CAAE85] to-[#997B51] bg-clip-text text-transparent uppercase py-1 whitespace-nowrap">
                        OTANTIK CORE
                    </h1>
                    <p className="text-xs md:text-sm text-slate-300/80 font-medium tracking-wide mt-1 whitespace-nowrap">
                        {subtitle}
                    </p>
                </div>

                {/* Refined Gold Separator */}
                <div className="w-28 h-[1px] bg-gradient-to-r from-transparent via-[#CAAE85]/50 to-transparent mb-8" />

                {/* Progress Bar & Status */}
                <div className="flex flex-col items-center gap-4 w-full max-w-[280px] sm:max-w-[320px]">
                    {/* Shimmer Progress Track */}
                    <div className="h-2 w-full bg-black/80 rounded-full overflow-hidden relative border border-[#CAAE85]/35 p-[1px] shadow-inner">
                        <div className="h-full w-full bg-gradient-to-r from-[#CAAE85]/30 via-[#CAAE85] to-[#CAAE85]/30 rounded-full relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/90 to-transparent animate-[shimmer_1.8s_infinite] -translate-x-full" />
                        </div>
                    </div>

                    {/* Status Text with Pulsing Dot */}
                    <div dir="ltr" className="flex items-center justify-center gap-2.5 text-xs md:text-sm font-mono tracking-widest text-[#CAAE85] font-semibold uppercase whitespace-nowrap">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CAAE85] opacity-80"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#CAAE85]"></span>
                        </span>
                        <span className="animate-pulse">{message}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Luxury Footer */}
            <div dir="ltr" className="relative z-10 mt-8 flex items-center justify-center gap-2.5 sm:gap-3 text-[10px] md:text-xs font-bold tracking-widest text-slate-500/80 uppercase whitespace-nowrap">
                <span>LEVANT GROUP</span>
                <span>•</span>
                <span className="text-[#CAAE85]/80 font-semibold">Immutable Core Active</span>
                <span>•</span>
                <span>v3.1.04</span>
            </div>
        </div>
    );
}

