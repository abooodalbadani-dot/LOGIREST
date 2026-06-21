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
      if (entity === 'suppliers' || entity === 'openingStock') {
        if (!file) {
          throw new Error('No file selected for upload');
        }
        const formData = new FormData();
        formData.append('file', file);

        const path = entity === 'suppliers' ? '/imports/suppliers' : '/imports/opening-stock';
        return apiClient.post(path, ImportResponseSchema, formData);
      }
      
      // Simulate API Call for existing/other items with strict 2s delay
      console.log(`[Import] Committing simulated import for ${entity}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return { total: state.data.length, successCount: state.data.length, failedCount: 0, errors: [] };
    },
    onSuccess: (data, variables) => {
      // Invalidate to ensure consistency
      const queryKey = [variables.entity];
      queryClient.invalidateQueries({ queryKey });
      
      if (data.failedCount > 0) {
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
        }));
        transitionTo('ERRORS');
      } else {
        transitionTo('SUCCESS');
      }
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

