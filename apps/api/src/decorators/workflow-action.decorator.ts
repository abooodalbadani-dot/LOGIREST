import { SetMetadata } from '@nestjs/common';
import { DocumentType, DocumentAction } from '@logirest/shared-types';

export const WORKFLOW_ACTION_KEY = 'workflow_action';

export interface WorkflowActionMetadata {
  docType: DocumentType;
  action: DocumentAction;
  modelName:
    | 'purchaseRequest'
    | 'purchaseOrder'
    | 'goodsReceivedNote'
    | 'inventoryIssue'
    | 'transfer'
    | 'adjustment'
    | 'stocktakeSession'
    | 'kitchenRequest';
  idParam?: string; // defaults to 'id'
}

export const WorkflowAction = (metadata: WorkflowActionMetadata) =>
  SetMetadata(WORKFLOW_ACTION_KEY, metadata);
