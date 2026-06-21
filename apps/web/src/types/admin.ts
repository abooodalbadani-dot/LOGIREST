import { z } from 'zod';

export const AdminSettingsSchema = z.object({
  id: z.string(),
  systemName: z.string().min(1, 'System name is required'),
  baseCurrency: z.string().min(1, 'Base currency is required'),
  branchId: z.string().min(1, 'Branch context is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  localeDefault: z.enum(['en', 'ar']),
  senderName: z.string().min(1, 'Sender name is required'),
  replyToEmail: z.string().email('Invalid email address'),
  hasTransactions: z.boolean().optional(),
  mailProvider: z.enum(['smtp', 'ses']).optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpEncryption: z.enum(['none', 'ssl', 'tls']).optional(),
  version: z.number(),
  updatedAt: z.string(),
  updatedBy: z.string().optional(),
  printSettings: z.object({
    defaultPaperSize: z.enum(['A4', '80mm', '58mm']),
    thermalShowLogo: z.boolean(),
    autoPrintOnFulfill: z.boolean(),
    showSystemName: z.boolean().optional(),
  }).optional(),
});

export type AdminSettings = z.infer<typeof AdminSettingsSchema>;
