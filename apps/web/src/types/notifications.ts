import { z } from 'zod';

export interface NotificationTemplate {
  id: string;
  code: string;
  subject_ar: string;
  subject_en: string;
  body_ar: string;
  body_en: string;
  trigger_event: string;
  is_active: boolean;
  allowed_parameters: TemplateParameter[];
}

export interface TemplateParameter {
  name: string;
  label_ar: string;
  label_en: string;
  sample_value: string;
  entity?: string;
  field_path?: string;
}

export interface TriggerEvent {
  code: string;
  name_ar: string;
  name_en: string;
  entity_type: string;
  description: string;
  suggested_fields: string[];
}

export interface EntityField {
  entity: string;
  field: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  label_ar: string;
  label_en: string;
  sample_value: string;
}

export const TemplateParameterSchema = z.object({
  name: z.string(),
  label_ar: z.string(),
  label_en: z.string(),
  sample_value: z.string(),
  entity: z.string().optional(),
  field_path: z.string().optional(),
});

export type TemplateParameterRow = z.infer<typeof TemplateParameterSchema>;

export const TriggerEventSchema = z.object({
  code: z.string(),
  name_ar: z.string(),
  name_en: z.string(),
  entity_type: z.string(),
  description: z.string(),
  suggested_fields: z.array(z.string()),
});

export const EntityFieldSchema = z.object({
  entity: z.string(),
  field: z.string(),
  type: z.enum(['string', 'number', 'date', 'boolean']),
  label_ar: z.string(),
  label_en: z.string(),
  sample_value: z.string(),
});

export const ParameterRegistrySchema = z.record(z.string(), z.array(EntityFieldSchema));

export const NotificationTemplateSchema = z.object({
  id: z.string(),
  code: z.string(),
  subject_ar: z.string(),
  subject_en: z.string(),
  body_ar: z.string(),
  body_en: z.string(),
  trigger_event: z.string(),
  is_active: z.boolean(),
  allowed_parameters: z.array(TemplateParameterSchema).default([]),
});

export type NotificationTemplateRow = z.infer<typeof NotificationTemplateSchema>;

export interface EmailOutboxEntry { id: string; template_id: string; recipient_email: string; subject: string; sent_at: string | null; status: 'PENDING'|'SENT'|'FAILED'; error_message: string | null; }
export interface AuditLogEntry { id: string; entity_type: string; entity_id: string; action: 'CREATE'|'UPDATE'|'DELETE'|'POST'|'APPROVE'; user_id: string; user_name: string; changes: { field: string; old_value: unknown; new_value: unknown; }[]; created_at: string; }
export const AuditLogEntrySchema = z.object({
 id: z.string(),
 entity_type: z.string(),
 entity_id: z.string(),
 action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'POST', 'APPROVE']),
 user_id: z.string(),
 user_name: z.string(),
 changes: z.array(z.object({
 field: z.string(),
 old_value: z.unknown(),
 new_value: z.unknown(),
 })),
 created_at: z.string(),
});
