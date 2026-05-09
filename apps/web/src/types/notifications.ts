import { z } from 'zod';
export interface NotificationTemplate { id: string; code: string; subject_ar: string; subject_en: string; body_ar: string; body_en: string; trigger_event: string; is_active: boolean; }
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
