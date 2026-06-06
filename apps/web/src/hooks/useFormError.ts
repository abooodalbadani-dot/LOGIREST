'use client';

import { toast } from 'sonner';
import { FieldErrors, FieldValues } from 'react-hook-form';

/**
 * Generic form validation error callback handler.
 * Logs validation errors to console for debugging and triggers a user-facing toast alert.
 */
export function onFormError(errors: FieldErrors<FieldValues>) {
  console.error('[Form Validation Failure] Failed to validate form fields:', errors);
  
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
