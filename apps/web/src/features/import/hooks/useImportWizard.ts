import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImportEntity } from '@/lib/import/templates';
import { ValidationError } from '@/lib/import/validation';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';

export type ImportStep = 'UPLOAD' | 'VALIDATING' | 'ERRORS' | 'COMMIT' | 'SUCCESS';
export type ImportType = ImportEntity;


export interface ImportMetadata {
 fileName: string;
 fileSize: number;
 recordCount: number;
}

export interface ImportState {
  step: ImportStep;
  entity: ImportEntity;
  metadata: ImportMetadata | null;
  data: Record<string, unknown>[];
  errors: ValidationError[];
  idempotencyKey: string | null;
  file?: File | null;
  successCount?: number;
  failedCount?: number;
}

export interface WizardReturn extends ImportState {
  isCommitting: boolean;
  setFileData: (fileName: string, fileSize: number, data: Record<string, unknown>[], file?: File | null) => void;
  setValidationResults: (errors: ValidationError[]) => void;
  handleCommit: () => void;
  transitionTo: (nextStep: ImportStep) => void;
  reset: () => void;
}

const ImportResponseSchema = z.object({
  total: z.number(),
  successCount: z.number(),
  failedCount: z.number(),
  errors: z.array(
    z.object({
      row: z.number(),
      message: z.string(),
    })
  ),
});

export const useImportWizard = (initialEntity: ImportEntity): WizardReturn => {
  const queryClient = useQueryClient();
  
  const [state, setState] = useState<ImportState>({
    step: 'UPLOAD',
    entity: initialEntity,
    metadata: null,
    data: [],
    errors: [],
    idempotencyKey: null,
    file: null,
    successCount: 0,
    failedCount: 0,
  });

  const transitionTo = useCallback((nextStep: ImportStep) => {
    setState((prev) => {
      // STRICT State Machine Guards
      const allowedTransitions: Record<ImportStep, ImportStep[]> = {
        UPLOAD: ['VALIDATING'],
        VALIDATING: ['ERRORS', 'COMMIT'],
        ERRORS: ['UPLOAD'],
        COMMIT: ['SUCCESS', 'ERRORS'],
        SUCCESS: ['UPLOAD'],
      };

      if (!allowedTransitions[prev.step].includes(nextStep)) {
        console.error(`[Wizard Error] Illegal transition: ${prev.step} -> ${nextStep}`);
        return prev;
      }

      // Idempotency Key Generation - ONLY when entering COMMIT
      let nextIdempotencyKey = prev.idempotencyKey;
      if (nextStep === 'COMMIT' && !nextIdempotencyKey) {
        nextIdempotencyKey = crypto.randomUUID();
      }

      return {
        ...prev,
        step: nextStep,
        idempotencyKey: nextIdempotencyKey,
      };
    });
  }, []);

  const setFileData = useCallback((fileName: string, fileSize: number, data: Record<string, unknown>[], file?: File | null) => {
    setState((prev) => ({
      ...prev,
      metadata: {
        fileName,
        fileSize,
        recordCount: data.length,
      },
      data,
      errors: [],
      file: file || null,
    }));
    transitionTo('VALIDATING');
  }, [transitionTo]);

  const setValidationResults = useCallback((errors: ValidationError[]) => {
    setState((prev) => ({ ...prev, errors }));
    if (errors.length > 0) {
      transitionTo('ERRORS');
    } else {
      transitionTo('COMMIT');
    }
  }, [transitionTo]);

  const commitMutation = useMutation({
    mutationFn: async ({ entity, file }: { entity: ImportEntity; file: File | null; idempotencyKey: string }) => {
      if (!file) {
        throw new Error('No file selected for upload');
      }
      const formData = new FormData();
      formData.append('file', file);

      let path = '';
      if (entity === 'suppliers') {
        path = '/imports/suppliers';
      } else if (entity === 'openingStock') {
        path = '/imports/opening-stock';
      } else if (entity === 'categories') {
        path = '/imports/categories';
      } else if (entity === 'uoms') {
        path = '/imports/uoms';
      } else if (entity === 'barcodes') {
        path = '/imports/barcodes';
      } else {
        path = '/imports/items';
      }

      return apiClient.post(path, ImportResponseSchema, formData);
    },
    onSuccess: (data, variables) => {
      // Invalidate to ensure consistency
      const queryKey = [variables.entity];
      queryClient.invalidateQueries({ queryKey });
      
      const mappedErrors: ValidationError[] = data.errors.map((err) => ({
        row: err.row,
        column: 'Database',
        severity: 'error',
        message: err.message,
        value: null,
      }));

      setState((prev) => ({
        ...prev,
        errors: mappedErrors,
        successCount: data.successCount,
        failedCount: data.failedCount,
      }));

      transitionTo('SUCCESS');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Database constraint or connection failure';
      setState((prev) => ({
        ...prev,
        errors: [
          {
            row: 0,
            column: 'Server',
            severity: 'error',
            message,
            value: null,
          },
        ],
        successCount: 0,
        failedCount: prev.metadata?.recordCount || 0,
      }));
      transitionTo('SUCCESS');
    },
  });

  const handleCommit = useCallback(() => {
    // Double submission prevention & state guard
    if (commitMutation.isPending || state.step !== 'COMMIT' || !state.idempotencyKey) {
      return;
    }

    commitMutation.mutate({
      entity: state.entity,
      file: state.file || null,
      idempotencyKey: state.idempotencyKey,
    });
  }, [commitMutation, state.step, state.entity, state.file, state.idempotencyKey]);

  const reset = useCallback(() => {
    setState({
      step: 'UPLOAD',
      entity: initialEntity,
      metadata: null,
      data: [],
      errors: [],
      idempotencyKey: null,
      file: null,
      successCount: 0,
      failedCount: 0,
    });
  }, [initialEntity]);

  return {
    ...state,
    isCommitting: commitMutation.isPending,
    setFileData,
    setValidationResults,
    handleCommit,
    transitionTo,
    reset,
  };
};

