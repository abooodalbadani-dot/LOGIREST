import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type ImportType = 'items' | 'uoms' | 'barcodes';

export type ImportStep =
  | 'UPLOAD'
  | 'VALIDATING'
  | 'ERRORS'
  | 'COMMIT'
  | 'SUCCESS';

export interface ValidationError {
  row: number;
  column: string;
  message: string;
  value: any;
  severity: 'error' | 'warning';
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
}

export interface ImportState {
  currentStep: ImportStep;
  importType: ImportType;
  fileMetadata: FileMetadata | null;
  data: any[];
  errors: ValidationError[];
  successCount: number;
  idempotencyKey: string | null;
}

export const useImportWizard = (initialType: ImportType) => {
  const [state, setState] = useState<ImportState>({
    currentStep: 'UPLOAD',
    importType: initialType,
    fileMetadata: null,
    data: [],
    errors: [],
    successCount: 0,
    idempotencyKey: null,
  });

  const queryClient = useQueryClient();

  const reset = () => {
    setState({
      currentStep: 'UPLOAD',
      importType: initialType,
      fileMetadata: null,
      data: [],
      errors: [],
      successCount: 0,
      idempotencyKey: null,
    });
  };

  const setFileMetadata = (metadata: FileMetadata) => {
    setState((prev) => ({ ...prev, fileMetadata: metadata }));
  };

  const setParsedData = (data: any[]) => {
    setState((prev) => ({ ...prev, data }));
  };

  const startValidation = () => {
    setState((prev) => ({ ...prev, currentStep: 'VALIDATING' }));
    validateMutation.mutate(state.data);
  };

  const validateMutation = useMutation({
    mutationFn: async (data: any[]) => {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      const errors: ValidationError[] = [];
      
      data.forEach((row, index) => {
        const rowNum = index + 2;

        if (state.importType === 'items') {
          if (!row.Code) errors.push({ row: rowNum, column: 'Code', message: 'Required', value: '', severity: 'error' });
          if (!row.Name) errors.push({ row: rowNum, column: 'Name', message: 'Required', value: '', severity: 'error' });
          if (row.Code === 'ERR-101') {
            errors.push({ row: rowNum, column: 'Code', message: 'Simulated System Error', value: row.Code, severity: 'error' });
          }
        }

        if (state.importType === 'uoms') {
          if (!row.Code) errors.push({ row: rowNum, column: 'Code', message: 'Required', value: '', severity: 'error' });
        }

        if (state.importType === 'barcodes') {
          if (!row.Barcode) errors.push({ row: rowNum, column: 'Barcode', message: 'Required', value: '', severity: 'error' });
        }
      });

      return errors;
    },
    onSuccess: (errors) => {
      if (errors.some(e => e.severity === 'error')) {
        setState((prev) => ({ ...prev, errors, currentStep: 'ERRORS' }));
      } else {
        setState((prev) => ({ 
          ...prev, 
          errors, 
          currentStep: 'COMMIT',
          idempotencyKey: crypto.randomUUID()
        }));
      }
    },
  });

  const commitMutation = useMutation({
    mutationFn: async ({ entity, payload, idempotencyKey }: { entity: ImportType, payload: any[], idempotencyKey: string }) => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2500));
      console.log(`Committing ${payload.length} ${entity} with key ${idempotencyKey}`);
      return payload.length;
    },
    onSuccess: (count) => {
      setState((prev) => ({ ...prev, successCount: count, currentStep: 'SUCCESS' }));
      
      // Atomic cache update simulation
      queryClient.setQueryData([state.importType], (old: any[] = []) => {
        // In a real app, this would be a more complex merge or a full invalidation
        return [...state.data, ...old];
      });
      
      queryClient.invalidateQueries({ queryKey: [state.importType] });
    },
  });

  const goToUpload = () => {
    setState((prev) => ({ ...prev, currentStep: 'UPLOAD', errors: [] }));
  };

  return {
    ...state,
    setFileMetadata,
    setParsedData,
    startValidation,
    isValidating: validateMutation.isPending,
    commit: () => {
      if (state.idempotencyKey) {
        commitMutation.mutate({
          entity: state.importType,
          payload: state.data,
          idempotencyKey: state.idempotencyKey
        });
      }
    },
    isCommitting: commitMutation.isPending,
    goToUpload,
    reset,
  };
};
