import { ImportStep, ImportType, ImportMetadata } from '@/features/import/hooks/useImportWizard';

export interface ValidationError {
 row: number;
 column: string;
 severity: 'error' | 'warning';
 message: string;
 value?: unknown;
}

export interface ImportWizardState {
 step: ImportStep;
 importType: ImportType;
 metadata: ImportMetadata | null;
 data: Record<string, unknown>[];
 errors: ValidationError[];
 isValidating: boolean;
 isCommitting: boolean;
 successCount: number;
 setFileData: (fileName: string, fileSize: number, data: Record<string, unknown>[]) => void;
 setValidationResults: (errors: ValidationError[]) => void;
 handleCommit: () => void;
 nextStep: () => void;
 prevStep: () => void;
 transitionTo: (step: ImportStep) => void;
 reset: () => void;
}

