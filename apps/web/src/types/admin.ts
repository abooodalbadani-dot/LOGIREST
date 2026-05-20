import { z } from 'zod';

export const AdminSettingsSchema = z.object({
  id: z.string(),
  system_name: z.string().min(1, 'System name is required'),
  base_currency: z.string().min(1, 'Base currency is required'),
  branch_id: z.string().min(1, 'Branch context is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  locale_default: z.enum(['en', 'ar']),
  sender_name: z.string().min(1, 'Sender name is required'),
  reply_to_email: z.string().email('Invalid email address'),
  has_transactions: z.boolean().optional(),
  mail_provider: z.enum(['smtp', 'ses']).optional(),
  smtp_host: z.string().optional(),
  smtp_port: z.number().optional(),
  smtp_user: z.string().optional(),
  smtp_password: z.string().optional(),
  smtp_encryption: z.enum(['none', 'ssl', 'tls']).optional(),
  version: z.number(),
  updated_at: z.string(),
  updated_by: z.string().optional(),
});

export type AdminSettings = z.infer<typeof AdminSettingsSchema>;
