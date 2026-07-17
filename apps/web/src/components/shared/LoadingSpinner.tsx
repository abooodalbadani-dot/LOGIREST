'use client';

export default function LoadingSpinner() {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center w-full min-h-[100dvh] bg-[#050505] text-[#f1f5f9] font-sans antialiased p-8 select-none">
            <div className="flex flex-col items-center text-center gap-4 max-w-xs w-full">
                <div className="flex flex-col items-center gap-2">
                    <span className="text-lg md:text-xl font-bold tracking-widest text-brand-gold">
                        /OTANTIK_CORE
                    </span>
                    <div className="w-5 h-5 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="h-[1px] w-1/2 bg-white/10" />
                <p className="text-sm md:text-base font-mono tracking-wider animate-pulse text-gray-400">
                    INITIALIZING_CORE_SYSTEMS
                </p>
            </div>
        </div>
    );
}
