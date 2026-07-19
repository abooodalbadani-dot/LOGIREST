'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { Html5Qrcode } from 'html5-qrcode';

interface CameraBarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  className?: string;
}

export function CameraBarcodeScanner({ onScanSuccess, className }: CameraBarcodeScannerProps) {
  const t = useTranslations('common');
  
  const translateSafe = useCallback((key: string, fallback: string) => {
    try {
      return t(key) || fallback;
    } catch {
      return fallback;
    }
  }, [t]);

  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = useRef(`camera-scanner-${Math.random().toString(36).substring(2, 11)}`).current;
  // Stable callback ref — prevents scanner re-initialization when parent re-renders with new inline arrow
  const onScanSuccessRef = useRef(onScanSuccess);
  useEffect(() => { onScanSuccessRef.current = onScanSuccess; }, [onScanSuccess]);
  const stableOnScanSuccess = useCallback((text: string) => onScanSuccessRef.current(text), []);

  useEffect(() => {
    let active = true;

    // Dynamically import html5-qrcode to prevent server-side rendering issues
    import('html5-qrcode').then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
      if (!active) return;

      const formats = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE
      ];

      const html5QrCode = new Html5Qrcode(elementId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: (width: number, height: number) => {
          const size = Math.min(width * 0.7, 250);
          return {
            width: Math.floor(size),
            height: Math.floor(size)
          };
        },
        formatsToSupport: formats,
      };

      interface CameraTrackConstraints extends MediaTrackConstraints {
        advanced?: Array<MediaTrackConstraintSet & { focusMode?: string; zoom?: number }>;
      }

      const constraints: CameraTrackConstraints = {
        facingMode: 'environment',
        width: { min: 1280, ideal: 1920 },
        height: { min: 720, ideal: 1080 },
        advanced: [
          { focusMode: 'continuous' },
          { zoom: 1.5 }
        ]
      };

      html5QrCode.start(
        constraints,
        config,
        (decodedText) => {
          if (active) {
            stableOnScanSuccess(decodedText);
          }
        },
        () => {
          // Ignore verbose individual frame scanning failure logs
        }
      )
        .then(() => {
          if (active) {
            setIsInitializing(false);
          }
        })
        .catch((err: unknown) => {
          if (active) {
            const msg = err instanceof Error ? err.message : 'Camera permission denied or camera not found.';
            console.error('Failed to initialize browser camera scanner:', msg);
            setError(msg);
            setIsInitializing(false);
          }
        });
    }).catch((err: unknown) => {
      if (active) {
        const msg = err instanceof Error ? err.message : 'Failed to load scanner module.';
        console.error('Failed to load html5-qrcode scanner module:', msg);
        setError(msg);
        setIsInitializing(false);
      }
    });

    return () => {
      active = false;
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        if (scanner.isScanning) {
          scanner.stop().catch((err: unknown) => {
            console.error('Failed to stop camera scanner session:', err instanceof Error ? err.message : String(err));
          });
        }
      }
    };
    // stableOnScanSuccess is memoized — safe dep; elementId is stable (computed once via useRef)
  }, [stableOnScanSuccess, elementId]);

  return (
    <div className={cn("w-full bg-black overflow-hidden relative", className || "h-72")}>
      {/* Camera viewfinder target element — html5-qrcode injects <div><video> here */}
      <div id={elementId} className="absolute inset-0 w-full h-full [&>div]:!w-full [&>div]:!h-full [&>div>video]:!w-full [&>div>video]:!h-full [&>div>video]:object-cover" />

      {/* Loading state indicator */}
      {isInitializing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-20 text-white gap-3 p-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs font-semibold tracking-wider animate-pulse">
            {translateSafe('loading_camera', 'Initializing Camera Feed...')}
          </p>
        </div>
      )}

      {/* Error permission overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-20 text-white gap-4 p-6 text-center">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-red-500">{translateSafe('camera_error', 'Camera Connection Failed')}</h4>
            <p className="text-[11px] text-gray-400 max-w-2xl">{error}</p>
          </div>
        </div>
      )}

      {/* Scanning overlay framing */}
      {!isInitializing && !error && (
        <div className="absolute inset-0 pointer-events-none border border-white/5 z-10 flex items-center justify-center">
          {/* Centered Square Viewfinder matching qrbox */}
          <div className="absolute w-[250px] h-[250px] max-w-[70%] max-h-[70%] border border-primary/20 rounded-xl flex items-center justify-center pointer-events-none">
            {/* Red scanning line animation */}
            <div className="w-full h-0.5 bg-primary/70 shadow-[0_0_12px_rgba(202,174,133,0.8)] animate-[scan-line_2.2s_infinite]" />
            
            {/* Viewfinder Corners */}
            <div className="absolute left-0 top-0 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl-md" />
            <div className="absolute right-0 top-0 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr-md" />
            <div className="absolute left-0 bottom-0 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl-md" />
            <div className="absolute right-0 bottom-0 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br-md" />
          </div>
        </div>
      )}

    </div>
  );
}
