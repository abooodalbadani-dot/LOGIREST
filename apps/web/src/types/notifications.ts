import { z } from 'zod';

export interface NotificationTemplate {
  id: string;
  code: string;
  subjectAr: string;
  subjectEn: string;
  bodyAr: string;
  bodyEn: string;
  triggerEvent: string;
  isActive: boolean;
  allowedParameters: TemplateParameter[];
}

export interface TemplateParameter {
  name: string;
  labelAr: string;
  labelEn: string;
  sampleValue: string;
  entity?: string;
  fieldPath?: string;
}

export interface TriggerEvent {
  code: string;
  nameAr: string;
  nameEn: string;
  entityType: string;
  description: string;
  suggestedFields: string[];
}

export interface EntityField {
  entity: string;
  field: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  labelAr: string;
  labelEn: string;
  sampleValue: string;
}

export const TemplateParameterSchema = z.object({
  name: z.string(),
  labelAr: z.string(),
  labelEn: z.string(),
  sampleValue: z.string(),
  entity: z.string().optional(),
  fieldPath: z.string().optional(),
});

export type TemplateParameterRow = z.infer<typeof TemplateParameterSchema>;

export const TriggerEventSchema = z.object({
  code: z.string(),
  nameAr: z.string(),
  nameEn: z.string(),
  entityType: z.string(),
  description: z.string(),
  suggestedFields: z.array(z.string()),
});

export const EntityFieldSchema = z.object({
  entity: z.string(),
  field: z.string(),
  type: z.enum(['string', 'number', 'date', 'boolean']),
  labelAr: z.string(),
  labelEn: z.string(),
  sampleValue: z.string(),
});

export const ParameterRegistrySchema = z.record(z.string(), z.array(EntityFieldSchema));

export const EmailTemplateCodeSchema = z.enum([
  'LOW_STOCK_ALERT',
  'EXPIRY_WARNING_ALERT',
  'ADJUSTMENT_POSTED',
  'STOCKTAKE_POSTED',
  'TRANSFER_SHIPPED',
  'TRANSFER_RECEIVED',
  'PR_APPROVED',
  'PR_REJECTED',
  'PO_PENDING_APPROVAL',
  'PO_APPROVED',
  'KITCHEN_REQUEST_SUBMITTED',
  'KITCHEN_REQUEST_POSTED',
  'GRN_POSTED',
]);

export const NotificationTemplateSchema = z.object({
  id: z.string(),
  code: EmailTemplateCodeSchema,
  subjectAr: z.string(),
  subjectEn: z.string(),
  bodyAr: z.string(),
  bodyEn: z.string(),
  triggerEvent: z.string(),
  isActive: z.boolean(),
  allowedParameters: z.array(TemplateParameterSchema).default([]),
});

export type NotificationTemplateRow = z.infer<typeof NotificationTemplateSchema>;

export interface EmailOutboxEntry {
  id: string;
  templateId: string;
  recipientEmail: string;
  subject: string;
  sentAt: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED';
  errorMessage: string | null;
}

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'APPROVE' | 'LOGIN' | 'LOGOUT';
  userId: string;
  userName: string;
  changes: {
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
  }[];
  createdAt: string;
}

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  entityType: z.string().nullable().optional().transform((v) => v || 'SYSTEM'),
  entityId: z.string().nullable().optional().transform((v) => v || 'N/A'),
  action: z.string().catch('UPDATE'),
  userId: z.string().nullable().optional().transform((v) => v || 'system'),
  userName: z.string().nullable().optional().transform((v) => v || 'System'),
  changes: z.array(
    z.object({
      field: z.string(),
      oldValue: z.unknown().optional(),
      newValue: z.unknown().optional(),
    })
  ).nullable().optional().transform((v) => v || []),
  createdAt: z.union([z.string(), z.date()]).transform((v) => typeof v === 'string' ? v : (v ? v.toISOString() : new Date().toISOString())),
});

export const NotificationLogSchema = z.object({
  id: z.string(),
  targetRole: z.string(),
  warehouseId: z.string().nullable().optional(),
  message: z.string(),
  isRead: z.boolean(),
  createdAt: z.string(),
  documentType: z.string().nullable().optional(),
  documentId: z.string().nullable().optional(),
});
export type NotificationLog = z.infer<typeof NotificationLogSchema>;
