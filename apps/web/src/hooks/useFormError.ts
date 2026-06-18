'use client';

import { toast } from 'sonner';
import { FieldErrors, FieldValues } from 'react-hook-form';


/**
 * Generic form validation error callback handler.
 * Logs validation errors to console for debugging and triggers a user-facing toast alert.
 */
function serializeFormErrors(errors: FieldErrors<FieldValues>): string {
  const seen = new WeakSet();
  return JSON.stringify(errors, (key, value: unknown) => {
    if (key === 'ref') {
      return undefined;
    }
    if (typeof window !== 'undefined' && typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) {
      return undefined;
    }
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
}

export function onFormError(errors: FieldErrors<FieldValues>) {
  console.error('[Form Validation Failure] Failed to validate form fields: ' + serializeFormErrors(errors));
  
  const simplified: Record<string, string | undefined> = {};
  for (const [key, error] of Object.entries(errors)) {
    if (error && typeof error === 'object' && 'message' in error) {
      simplified[key] = (error as { message?: string }).message;
    } else if (error) {
      simplified[key] = String(error);
    }
  }
  console.error('[Form Validation Failure] Fields with validation issues: ' + JSON.stringify(simplified));
  
  toast.error("يرجى مراجعة الحقول المحددة / Please check the highlighted fields", {
    duration: 5000,
  });
}

/**
 * Hook interface providing the generic form error handler.
 */
export function useFormError() {
  return onFormError;
}
