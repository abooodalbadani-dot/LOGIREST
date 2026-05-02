import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImportEntity } from '@/lib/import/templates';
import { ValidationError } from '@/lib/import/validation';

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
}

export interface WizardReturn extends ImportState {
 isCommitting: boolean;
 setFileData: (fileName: string, fileSize: number, data: Record<string, unknown>[]) => void;
 setValidationResults: (errors: ValidationError[]) => void;
 handleCommit: () => void;
 transitionTo: (nextStep: ImportStep) => void;
 reset: () => void;
}

export const useImportWizard = (initialEntity: ImportEntity): WizardReturn => {
 const queryClient = useQueryClient();
 
 const [state, setState] = useState<ImportState>({
 step: 'UPLOAD',
 entity: initialEntity,
 metadata: null,
 data: [],
 errors: [],
 idempotencyKey: null,
 });

 const transitionTo = useCallback((nextStep: ImportStep) => {
 setState((prev) => {
 // STRICT State Machine Guards
 const allowedTransitions: Record<ImportStep, ImportStep[]> = {
 UPLOAD: ['VALIDATING'],
 VALIDATING: ['ERRORS', 'COMMIT'],
 ERRORS: ['UPLOAD'],
 COMMIT: ['SUCCESS'],
 SUCCESS: ['UPLOAD'], // For reset/starting over
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

 const setFileData = useCallback((fileName: string, fileSize: number, data: Record<string, unknown>[]) => {
 setState((prev) => ({
 ...prev,
 metadata: {
 fileName,
 fileSize,
 recordCount: data.length,
 },
 data,
 errors: [],
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
 mutationFn: async ({ entity, payload, idempotencyKey }: { entity: ImportEntity, payload: Record<string, unknown>[], idempotencyKey: string }) => {
 // Simulate API Call with strict 2s delay
 console.log(`[Import] Committing ${payload.length} records for ${entity} (Key: ${idempotencyKey})`);
 await new Promise((resolve) => setTimeout(resolve, 2000));
 return { success: true, count: payload.length };
 },
 onSuccess: (_, variables) => {
 // Atomic Cache Update via TanStack Query
 const queryKey = [variables.entity];
 queryClient.setQueryData(queryKey, (prev: Record<string, unknown>[] = []) => {
 return [...prev, ...variables.payload];
 });
 
 // Invalidate to ensure consistency
 queryClient.invalidateQueries({ queryKey });
 
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
 payload: state.data,
 idempotencyKey: state.idempotencyKey,
 });
 }, [commitMutation, state.step, state.entity, state.data, state.idempotencyKey]);

 const reset = useCallback(() => {
 setState({
 step: 'UPLOAD',
 entity: initialEntity,
 metadata: null,
 data: [],
 errors: [],
 idempotencyKey: null,
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

