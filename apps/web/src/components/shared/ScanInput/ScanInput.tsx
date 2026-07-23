'use client';

import { Input } from '@/components/ui/input';
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, ScanLine, CheckCircle2, AlertCircle, Keyboard, Camera } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useAlwaysFocused } from '@/hooks/useAlwaysFocused';
import { useScannerWedge } from '@/hooks/useScannerWedge';
import { SmartCombobox, type ComboboxItem } from '../SmartCombobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CameraBarcodeScanner } from '../CameraBarcodeScanner';
import { audioAlerts } from '@/utils/audio';

interface ScanInputProps<T extends ComboboxItem = ComboboxItem> {
    onScan: (barcode: string) => void | Promise<void>;
    onError?: (barcode: string) => void;
    disabled?: boolean;
    readOnly?: boolean;
    placeholder?: string;
    className?: string;
    onCameraActivate?: () => void;
    enableCameraScan?: boolean;
    scanStatus?: "idle" | "success" | "error";
    statusMessage?: string;
    isScanning?: boolean;
    clearOnScan?: boolean;
    scannerMode?: boolean;
    variant?: "standard" | "retro";
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onManualTrigger?: () => void;
    size?: "sm" | "md" | "lg";
    label?: string;
    autoFocus?: boolean;
    latencyThreshold?: number;
    items?: T[];
    getPrimaryLabel?: (item: T) => string;
    getSecondaryLabel?: (item: T) => string | undefined;
    value?: string;
}

interface ScanInputComponent {
    <T extends ComboboxItem = ComboboxItem>(
        props: ScanInputProps<T> & { ref?: React.Ref<HTMLInputElement> }
    ): React.ReactElement | null;
    displayName?: string;
}

export const ScanInput = forwardRef(
    function ScanInput<T extends ComboboxItem = ComboboxItem>(
        {
            onScan,
            disabled,
            readOnly = false,
            placeholder,
            className,
            scanStatus = "idle",
            statusMessage,
            isScanning,
            clearOnScan = true,
            scannerMode = false,
            variant = "standard",
            value,
            onChange,
            onManualTrigger,
            onCameraActivate,
            enableCameraScan = true,
            size = "md",
            label,
            autoFocus = true,
            latencyThreshold,
            items,
            getPrimaryLabel,
            getSecondaryLabel
        }: ScanInputProps<T>,
        ref: React.ForwardedRef<HTMLInputElement>
    ) {
        const tc = useTranslations('common');
        const locale = useLocale();
        const inputRef = useRef<HTMLInputElement>(null);
        const debounceTimer = useRef<NodeJS.Timeout | null>(null);
        const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
        const [isCameraOpen, setIsCameraOpen] = useState(false);

        const handleCameraClick = () => {
            if (onCameraActivate) {
                onCameraActivate();
            } else {
                setIsCameraOpen(true);
            }
        };

        // Expose underlying inputRef via forwardRef
        useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

        // Sync internal value if value prop is provided
        useEffect(() => {
            if (value !== undefined && inputRef.current) {
                inputRef.current.value = value;
            }
        }, [value]);

        const [isManual, setIsManual] = useState(false);

        // Scoped autofocus regain to keep cursor locked to scanner input while respecting standard dropdown, form field, and modal blurs.
        // Disable focus lock if scanner is readOnly or in manual mode to prevent focus wars/loops
        useAlwaysFocused(inputRef, scannerMode && !disabled && !readOnly && !isManual);

        const processScan = async (val: string) => {
            const trimmed = val.trim();
            if (!trimmed) return;

            const now = Date.now();
            if (lastScanRef.current.code === trimmed && (now - lastScanRef.current.time) < 500) {
                return;
            }

            lastScanRef.current = { code: trimmed, time: now };

            if (clearOnScan && inputRef.current) {
                inputRef.current.value = '';
            }

            await onScan(trimmed);
        };

        // timing-based keyboard wedge handling, deduplication, and synth tones
        const { handleKeyDown: handleWedgeKeyDown } = useScannerWedge({
            onScan: async (barcode) => {
                await processScan(barcode);
            },
            enabled: scannerMode && !disabled && !readOnly,
            latencyThreshold,
        });

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (readOnly) return;
            if (e.key === 'Escape') {
                if (inputRef.current) inputRef.current.value = '';
                return;
            }

            // Route event through wedge scanner handler (timing keydown checks)
            handleWedgeKeyDown(e);
        };

        const onChangeWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (readOnly) return;
            const val = e.target.value;
            if (onChange) onChange(e);
            if (debounceTimer.current) clearTimeout(debounceTimer.current);

            if (val.length > 5) {
                debounceTimer.current = setTimeout(() => {
                    if (inputRef.current && inputRef.current.value === val) {
                        processScan(val);
                    }
                }, 300);
            }
        };

        const sizeConfigs = {
            sm: {
                container: "h-12",
                icon: "w-4 h-4",
                input: "text-label-sm px-3",
                button: "px-3 py-1.5 text-[10px]",
                buttonIcon: "w-3 h-3"
            },
            md: {
                container: "h-16",
                icon: "w-5 h-5",
                input: "text-body-md px-4",
                button: "px-5 py-2.5 text-label-xs",
                buttonIcon: "w-4 h-4"
            },
            lg: {
                container: "h-20",
                icon: "w-6 h-6",
                input: "text-title-medium px-6",
                button: "px-6 py-3 text-label-xs",
                buttonIcon: "w-4 h-4"
            }
        };

        const config = sizeConfigs[size];

        return (
            <div className={cn(variant === 'standard' ? "flex flex-col w-full" : "relative group w-full flex flex-col gap-3")}>
                {label && (
                    variant === 'standard' ? (
                        <div className="flex items-center justify-start gap-2 w-full flex-row-reverse mb-1">
                            <div className="w-2 h-2 rounded-full bg-brand-gold animate-pulse shadow-[0_0_8px_rgba(202,174,133,0.5)]"></div>
                            <span className="text-sm font-semibold text-brand-gold">{label}</span>
                        </div>
                    ) : (
                        <label className="text-[11px] font-black uppercase tracking-[0.25em] text-operational-cyan ps-1 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-operational-cyan rounded-full animate-pulse shadow-[0_0_10px_var(--operational-cyan)]" />
                            {label}
                        </label>
                    )
                )}

                <div className="w-full">
                    <div className={cn(
                        "relative flex items-center transition-all duration-200 overflow-hidden flex-1 min-w-[200px] w-full",
                        variant === 'retro' ? "rounded-sm border-[4px] shadow-2xl" : className ? className : "flex items-center w-full bg-gray-50 dark:bg-card border border-gray-200 dark:border-gray-700 text-[#0B1220] dark:text-white rounded-md h-12 px-4 text-start focus-within:border-[#b48e67] focus-within:ring-1 focus-within:ring-[#b48e67] overflow-hidden flex-1 min-w-[200px]",
                        variant === 'retro' && config.container,
                        variant === 'retro' ? (
                            scanStatus === 'success' ? "border-operational-cyan bg-operational-cyan/10 shadow-[0_0_60px_rgba(var(--operational-cyan-rgb),0.25)]" :
                                scanStatus === 'error' ? "border-destructive bg-destructive/10 shadow-[0_0_60px_rgba(var(--destructive-rgb),0.25)]" :
                                    readOnly ? "border-surface-container-highest bg-card border border-border shadow-sm/60 opacity-80 cursor-default" :
                                        "border-surface-container-highest bg-card hover:border-operational-cyan/50 focus-within:border-operational-cyan focus-within:ring-[12px] focus-within:ring-operational-cyan/10"
                        ) : (
                            scanStatus === 'success' ? "border-emerald-500 bg-emerald-500/10" :
                            scanStatus === 'error' ? "border-status-error bg-status-error/10" :
                            readOnly ? "opacity-70 cursor-default" : ""
                        )
                    )}>
                        {/* Background glow when focused */}
                        {variant === 'retro' && <div className="absolute inset-0 bg-gradient-to-r from-operational-cyan/5 via-transparent to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />}

                        <div className={cn(variant === 'retro' ? "shrink-0 flex items-center text-muted-foreground/40 transition-colors group-focus-within:text-operational-cyan z-10 ps-6" : "absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-20")}>
                            {isScanning ? (
                                <Loader2 className={cn("animate-spin text-operational-cyan", variant === 'retro' ? config.icon : "w-5 h-5")} />
                            ) : scanStatus === 'success' ? (
                                <CheckCircle2 className={cn("text-operational-cyan animate-in zoom-in duration-300", variant === 'retro' ? config.icon : "w-5 h-5")} />
                            ) : scanStatus === 'error' ? (
                                <AlertCircle className={cn("text-destructive animate-in shake duration-300", variant === 'retro' ? config.icon : "w-5 h-5")} />
                            ) : (
                                <ScanLine className={cn("transition-transform group-hover:scale-125 duration-300", variant === 'retro' ? config.icon : "w-5 h-5")} />
                            )}
                        </div>
                        {isManual ? (
                            <div className={cn("flex-1 min-w-0 z-10 flex items-center h-full", variant === 'retro' ? config.input : "pr-4 pl-12")}>
                                <SmartCombobox
                                    items={items || []}
                                    placeholder={placeholder || tc('search_placeholder') || 'Search item...'}
                                    getPrimaryLabel={getPrimaryLabel}
                                    getSecondaryLabel={getSecondaryLabel}
                                    onSelect={(item) => {
                                        const identifier = item.barcode || item.code || String(item.id);
                                        onScan(identifier);
                                        setIsManual(false);
                                        setTimeout(() => {
                                            inputRef.current?.focus();
                                        }, 100);
                                    }}
                                    className="flex-1 w-full h-full"
                                    triggerClassName="h-full bg-transparent border-none text-[#0B1220] dark:text-white w-full font-semibold text-sm md:text-base px-0 ps-0 pe-4 shadow-none outline-none focus:ring-0 focus:border-none focus-within:ring-0 focus-within:border-none hover:bg-transparent"
                                />
                            </div>
                        ) : (
                            <Input
                                ref={inputRef}
                                type="text"
                                dir="ltr"
                                disabled={disabled || isScanning}
                                readOnly={readOnly}
                                placeholder={placeholder || tc('scan_placeholder')}
                                onKeyDown={handleKeyDown}
                                onChange={onChangeWrapper}
                                autoComplete="off"
                                className={cn(
                                    "flex-1 min-w-0 bg-transparent border-none text-[#0B1220] dark:text-white transition-all duration-200 outline-none z-10 h-full focus:ring-0 focus:outline-none shadow-none",
                                    variant === 'retro' ? "placeholder:text-muted-foreground font-mono tracking-[0.25em] font-black" : "placeholder:text-muted-foreground text-sm md:text-base font-semibold px-2 pr-4 pl-12 focus:ring-0 focus:outline-none",
                                    readOnly && "cursor-default select-all opacity-70",
                                    variant === 'retro' && config.input
                                )}
                            />
                        )}

                        {variant === 'retro' && (
                            <div className="shrink-0 flex items-center pe-4 gap-3 z-10">
                                {(!readOnly) && (items || onManualTrigger) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (items) {
                                                setIsManual(prev => !prev);
                                            } else if (onManualTrigger) {
                                                onManualTrigger();
                                            }
                                        }}
                                        className={cn(
                                            "transition-all whitespace-nowrap flex items-center gap-2 active:scale-95 group/btn",
                                            "bg-operational-cyan/10 border-2 border-operational-cyan/30 hover:border-operational-cyan hover:bg-operational-cyan text-operational-cyan hover:text-white rounded-sm font-black uppercase shadow-sm",
                                            config.button
                                        )}
                                    >
                                        {isManual ? (
                                            <>
                                                <ScanLine className={cn("transition-transform group-hover/btn:-translate-y-0.5", config.buttonIcon)} />
                                                {tc('scan_mode')}
                                            </>
                                        ) : (
                                            <>
                                                <Keyboard className={cn("transition-transform group-hover/btn:-translate-y-0.5", config.buttonIcon)} />
                                                {tc('manual_entry')}
                                            </>
                                        )}
                                    </button>
                                )}

                                {enableCameraScan && !readOnly && (
                                    <button
                                        type="button"
                                        onClick={handleCameraClick}
                                        className={cn(
                                            "transition-all active:scale-95",
                                            "p-2 w-10 h-10 flex items-center justify-center text-muted-foreground/60 hover:text-operational-cyan hover:bg-operational-cyan/10 rounded-sm",
                                        )}
                                    >
                                        <Camera className={cn("transition-transform", config.buttonIcon)} />
                                    </button>
                                )}
                            </div>
                        )}

                        {statusMessage && (
                            <div className={cn(
                                "absolute -bottom-11 start-0 px-6 py-2.5 rounded-b-sm font-black text-[11px] uppercase tracking-[0.2em] animate-in slide-in-from-top-4 duration-200 shadow-2xl z-20",
                                scanStatus === 'success' ? "bg-operational-cyan text-white shadow-operational-cyan/20" : "bg-destructive text-white shadow-destructive/20"
                            )}>
                                {statusMessage}
                            </div>
                        )}

                        {variant === 'standard' && (
                            <div className="shrink-0 flex items-center gap-1.5 z-10 ms-auto">
                                {(!readOnly) && (items || onManualTrigger) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (items) {
                                                setIsManual(prev => !prev);
                                            } else if (onManualTrigger) {
                                                onManualTrigger();
                                            }
                                        }}
                                        className="h-8 px-2.5 bg-transparent hover:bg-gray-200/50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-semibold rounded-md transition-colors text-xs flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 group/btn"
                                    >
                                        {isManual ? (
                                            <>
                                                <ScanLine className="w-3.5 h-3.5" />
                                                <span className="hidden sm:inline">{tc('scan_mode')}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Keyboard className="w-3.5 h-3.5" />
                                                <span className="hidden sm:inline">{tc('manual_entry')}</span>
                                            </>
                                        )}
                                    </button>
                                )}

                                {enableCameraScan && !readOnly && (
                                    <button
                                        type="button"
                                        onClick={handleCameraClick}
                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-primary hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-md transition-all active:scale-95"
                                        title={locale === 'ar' ? 'مسح بالكاميرا' : 'Camera Scan'}
                                    >
                                        <Camera className="w-4.5 h-4.5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Industrial scan line animation when focused */}
                        {variant === 'retro' && <div className={cn(
                            "absolute top-0 left-0 w-[4px] h-full bg-operational-cyan shadow-[0_0_25px_var(--operational-cyan)] opacity-0 pointer-events-none transition-all duration-[2000ms] ease-in-out z-0",
                            "group-focus-within:animate-[scan_2s_infinite]",
                            !disabled && !isScanning && !readOnly && scanStatus === 'idle' && "group-focus-within:opacity-60"
                        )} />}
                    </div>
                </div>

                <style jsx>{`
     @keyframes scan {
      0% { transform: translateX(0); opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { transform: translateX(calc(100% - 4px)); opacity: 0; }
     }
    `}</style>

                <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
                    <DialogContent className="w-[min(440px,95vw)] bg-card border border-border shadow-lg p-0 rounded-2xl overflow-hidden">
                        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
                            <DialogTitle className="text-label-sm font-bold uppercase text-foreground flex items-center gap-2">
                                <ScanLine className="w-5 h-5 text-primary shrink-0" />
                                {locale === 'ar' ? 'مسح الباركود بالكاميرا' : 'Camera Barcode Scan'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="w-full">
                            {isCameraOpen && (
                                <CameraBarcodeScanner
                                    onScanSuccess={(barcode) => {
                                        audioAlerts.playScanSuccess();
                                        processScan(barcode);
                                        setIsCameraOpen(false);
                                    }}
                                />
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }
) as unknown as ScanInputComponent;

ScanInput.displayName = 'ScanInput';

