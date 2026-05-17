import { useEffect, useRef } from 'react';

/**
 * Hook to keep focus locked on a target scanner input.
 * Refocuses the input when the interaction context is completely idle,
 * i.e., focus falls to document.body, whitespace, or inactive page areas.
 * Focus is never stolen from active editable fields, active table cells, dropdowns, modals, or active forms.
 * 
 * @param inputRef Reference to the input element
 * @param enabled Whether focus locking is active
 */
export function useAlwaysFocused(
  inputRef: React.RefObject<HTMLInputElement | null>,
  enabled: boolean = true
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    const checkAndRefocus = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        const input = inputRef.current;
        if (!input) return;

        const active = document.activeElement;

        // If the scanner input is already focused, do nothing
        if (active === input) return;
        
        // If focus shifted to an active form field, action button, modal dialog, or table cell, do NOT steal focus.
        if (
          active &&
          active !== document.body &&
          (active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.tagName === 'SELECT' ||
            active.tagName === 'BUTTON' ||
            active.tagName === 'A' ||
            active.hasAttribute('contenteditable') ||
            active.closest('td') ||
            active.closest('th') ||
            active.hasAttribute('role') ||
            active.closest('[role="dialog"]') ||
            active.closest('[role="listbox"]') ||
            active.closest('.DialogContent') ||
            active.closest('[class*="-content"]') ||
            active.closest('.radix-select-content') ||
            active.closest('[role="option"]'))
        ) {
          return;
        }

        // Keep focus on the primary scanner input
        input.focus();
      }, 100);
    };

    const input = inputRef.current;
    if (input) {
      input.addEventListener('blur', checkAndRefocus);
    }

    // Add global document listeners to catch focus shifts or clicks on inactive areas
    document.addEventListener('focusin', checkAndRefocus);
    document.addEventListener('click', checkAndRefocus);

    // Initial refocus check
    checkAndRefocus();

    return () => {
      if (input) {
        input.removeEventListener('blur', checkAndRefocus);
      }
      document.removeEventListener('focusin', checkAndRefocus);
      document.removeEventListener('click', checkAndRefocus);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [inputRef, enabled]);
}

