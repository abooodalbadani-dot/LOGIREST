<<<<<<< HEAD:src/types/DocumentStatus.ts
export const ALL_DOCUMENT_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'POSTED',
  'CANCELLED',
  'RECEIVED',
  'VARIANCE_SUBMITTED',
  'FULFILLED',
  'PARTIAL',
  'STARTED',
  'COUNTING',
  'COUNTING_COMPLETED',
  'IN_TRANSIT',
  'OPEN',
  'REVIEW',
] as const;

export type DocumentStatus = typeof ALL_DOCUMENT_STATUSES[number];
=======
import { ALL_STATUSES, DocumentStatus } from '../contracts/statuses';

export const ALL_DOCUMENT_STATUSES = ALL_STATUSES;
export type { DocumentStatus };
>>>>>>> 002-frontend-baseline:apps/web/src/types/DocumentStatus.ts
