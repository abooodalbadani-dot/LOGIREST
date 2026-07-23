'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface CameraBarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  className?: string;
}

/**
 * Scans barcodes using the native getUserMedia API for reliable back-camera selection.
 * Bypasses html5-qrcode camera selection entirely.
 *
 * Strategy:
 * 1. getUserMedia with facingMode: environment => reliable back camera on all mobile devices.
 * 2. BarcodeDetector API (Chrome/Android) for scanning if available.
 * 3. Fall back to html5-qrcode scanFile() loop for iOS Safari.
 */
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const onScanSuccessRef = useRef(onScanSuccess);
  useEffect(() => { onScanSuccessRef.current = onScanSuccess; }, [onScanSuccess]);
  const stableOnScanSuccess = useCallback((text: string) => onScanSuccessRef.current(text), []);

  useEffect(() => {
    let active = true;

    if (typeof window === 'undefined') return;

    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setError('Camera access requires a secure HTTPS connection.');
      setIsInitializing(false);
      return;
    }

    const videoEl = videoRef.current;
    if (!videoEl) return;

    const stopStream = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };

    const startCamera = async () => {
      try {
        // The native getUserMedia API is the ONLY reliable way to get the back camera.
        // The OS-level browser handles facingMode: environment correctly on all mobile devices.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        videoEl.srcObject = stream;
        await videoEl.play();

        if (!active) return;
        setIsInitializing(false);

        const canvas = document.createElement('canvas');
        canvasRef.current = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        type BarcodeFormat = 'ean_13' | 'ean_8' | 'code_128' | 'code_39' | 'upc_a' | 'upc_e' | 'qr_code';
        interface DetectedBarcode { rawValue: string }
        interface BarcodeDetectorLike {
          detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
        }
        interface BarcodeDetectorConstructor {
          new(options: { formats: BarcodeFormat[] }): BarcodeDetectorLike;
        }

        const windowRecord = window as unknown as Record<string, unknown>;
        const BarcodeDetectorClass = (
          'BarcodeDetector' in window
            ? windowRecord['BarcodeDetector']
            : undefined
        ) as BarcodeDetectorConstructor | undefined;

        if (BarcodeDetectorClass) {
          // Path A: Native BarcodeDetector API (Chrome Android)
          const detector = new BarcodeDetectorClass({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
          });

          const scanLoop = async () => {
            if (!active) return;
            try {
              if (videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                const barcodes = await detector.detect(videoEl);
                if (barcodes.length > 0 && active) {
                  stableOnScanSuccess(barcodes[0].rawValue);
                }
              }
            } catch {
              // Suppress per-frame errors
            }
            animFrameRef.current = requestAnimationFrame(() => { void scanLoop(); });
          };

          animFrameRef.current = requestAnimationFrame(() => { void scanLoop(); });
        } else {
          // Path B: html5-qrcode scanFile() fallback (iOS Safari)
          const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
          if (!active) return;

          const tempId = '_scanner_temp_' + Math.random().toString(36).slice(2);
          const tempDiv = document.createElement('div');
          tempDiv.id = tempId;
          tempDiv.style.display = 'none';
          document.body.appendChild(tempDiv);

          const scanner = new Html5Qrcode(tempId, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.QR_CODE,
            ],
            verbose: false,
          });

          let scanning = false;

          const scanLoop = () => {
            if (!active) {
              scanner.clear();
              tempDiv.remove();
              return;
            }

            if (!scanning && videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && videoEl.videoWidth > 0) {
              canvas.width = videoEl.videoWidth;
              canvas.height = videoEl.videoHeight;
              ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

              scanning = true;
              canvas.toBlob(blob => {
                if (!blob || !active) {
                  scanning = false;
                  return;
                }

                const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' });
                scanner.scanFile(file, false)
                  .then(result => {
                    if (active) stableOnScanSuccess(result);
                  })
                  .catch(() => { })
                  .finally(() => {
                    scanning = false;
                  });
              }, 'image/jpeg', 0.9);
            }

            animFrameRef.current = requestAnimationFrame(scanLoop);
          };

          animFrameRef.current = requestAnimationFrame(scanLoop);
        }
      } catch (err) {
        if (active) {
          const msg = err instanceof Error ? err.message : String(err);
          setError('Camera connection failed: ' + msg);
          setIsInitializing(false);
        }
      }
    };

    void startCamera();

    return () => {
      active = false;
      stopStream();
    };
  }, [stableOnScanSuccess]);

  return (
    <div className={cn('w-full bg-card overflow-hidden relative', className || 'h-72')}>
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
        autoPlay
      />

      {isInitializing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card z-20 text-foreground gap-3 p-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs font-semibold tracking-wider animate-pulse">
            {translateSafe('loading_camera', 'Initializing Camera Feed...')}
          </p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-high/95 z-20 gap-4 p-6 text-center backdrop-blur-sm">
          <div className="p-3 bg-destructive/10 text-destructive rounded-full border border-destructive/20">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-destructive">{translateSafe('camera_error', 'Camera Connection Failed')}</h4>
            <p className="text-[11px] text-muted-foreground max-w-2xl">{error}</p>
          </div>
        </div>
      )}

      {!isInitializing && !error && (
        <div className="absolute inset-0 pointer-events-none border border-border z-10 flex items-center justify-center">
          <div className="absolute w-[250px] h-[250px] max-w-[70%] max-h-[70%] border border-primary/20 rounded-xl flex items-center justify-center pointer-events-none">
            <div className="w-full h-0.5 bg-primary/70 shadow-[0_0_12px_rgba(202,174,133,0.8)] animate-[scan-line_2.2s_infinite]" />
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
