'use client';

import { toast } from 'sonner';
import { FieldErrors, FieldValues } from 'react-hook-form';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneAndCleanErrors(value: unknown): unknown {
  if (isRecord(value)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (key === 'ref') {
        continue;
      }
      cleaned[key] = cloneAndCleanErrors(val);
    }
    return cleaned;
  }
  if (Array.isArray(value)) {
    return value.map(cloneAndCleanErrors);
  }
  return value;
}

/**
 * Generic form validation error callback handler.
 * Logs validation errors to console for debugging and triggers a user-facing toast alert.
 */
export function onFormError(errors: FieldErrors<FieldValues>) {
  try {
    console.error('[Form Validation Failure] Failed to validate form fields:', JSON.parse(JSON.stringify(errors)));
  } catch {
    try {
      const cleaned = cloneAndCleanErrors(errors);
      console.error('[Form Validation Failure] Failed to validate form fields:', JSON.parse(JSON.stringify(cleaned)));
    } catch {
      console.error('[Form Validation Failure] Failed to validate form fields:', errors);
    }
  }
  
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
