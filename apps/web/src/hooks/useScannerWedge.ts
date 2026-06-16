import { useRef } from 'react';
import { audioAlerts } from '@/utils/audio';

interface UseScannerWedgeProps {
  onScan: (barcode: string) => void | Promise<void>;
  enabled?: boolean;
  latencyThreshold?: number;
}

/**
 * Hook to manage timing-based USB wedge hardware barcode scanner timing tracking.
 * Prevents double-scans within a 300ms window and issues audio feedback cues.
 */
export function useScannerWedge({ onScan, enabled = true, latencyThreshold = 80 }: UseScannerWedgeProps) {
  const keystrokesRef = useRef<{ key: string; time: number }[]>([]);
  const lastScanTimeRef = useRef<number>(0);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!enabled) return;

    const char = e.key;
    const now = Date.now();

    // The scanner ends with Carriage Return (Enter)
    if (char === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      const barcode = e.currentTarget.value.trim();
      if (!barcode) return;

      // 1. Double-trigger prevention check (300ms lock window)
      if (now - lastScanTimeRef.current < 300) {
        audioAlerts.playScanDuplicate();
        e.currentTarget.value = '';
        keystrokesRef.current = [];
        return;
      }

      // 2. Measure average latency between keys to detect hardware scanning
      const strokes = keystrokesRef.current;
      let isHardware = false;
      if (strokes.length >= 3) {
        let totalGap = 0;
        for (let i = 1; i < strokes.length; i++) {
          totalGap += (strokes[i].time - strokes[i - 1].time);
        }
        const avgGap = totalGap / (strokes.length - 1);
        if (avgGap < latencyThreshold) {
          isHardware = true;
        }
      }

      // Reset the timing buffer
      keystrokesRef.current = [];

      try {
        lastScanTimeRef.current = now;
        
        // Execute scanning process
        const res = onScan(barcode);
        if (res instanceof Promise) {
          await res;
        }
        
        // Play success beep
        audioAlerts.playScanSuccess();
      } catch (err) {
        if (err instanceof Error) {
          if (err.message === 'WarehouseLocked') {
            audioAlerts.playScanBlocked();
          } else if (err.message === 'ScanDuplicate') {
            audioAlerts.playScanDuplicate();
          } else {
            audioAlerts.playScanInvalid();
          }
        } else {
          audioAlerts.playScanInvalid();
        }
      }

      // Clear the target input field on successful enter trigger
      e.currentTarget.value = '';
      return;
    }

    // Buffer character key events
    if (char.length === 1) {
      keystrokesRef.current.push({ key: char, time: now });
      
      // Prevent buffer memory leak
      if (keystrokesRef.current.length > 100) {
        keystrokesRef.current.shift();
      }
    }
  };

  return {
    handleKeyDown,
  };
}
