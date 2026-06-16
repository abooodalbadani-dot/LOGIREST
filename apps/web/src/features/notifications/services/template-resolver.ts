import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import type { TemplateParameter } from '@/types/notifications';

const ResolvedTemplateSchema = z.object({
 subject: z.string(),
 body: z.string(),
});

interface ResolveOptions {
 templateId: string;
 locale?: 'ar' | 'en';
 contextEntityId?: string;
 contextEntityType?: string;
 overrides?: Record<string, string>;
}

export async function resolveTemplate(options: ResolveOptions): Promise<{ subject: string; body: string } | null> {
 const { templateId, overrides } = options;

 try {
  const result = await apiClient.post(
   `/notifications/templates/${templateId}/resolve`,
   ResolvedTemplateSchema,
   { overrides: overrides || {} }
  );
  return result;
 } catch {
  return null;
 }
}

export function interpolateTemplate(
 subject: string,
 body: string,
 params: TemplateParameter[],
 overrides?: Record<string, string>
): { subject: string; body: string } {
 let resolvedSubject = subject || '';
 let resolvedBody = body || '';

 params.forEach((param) => {
  const regex = new RegExp(`\\{\\{\\s*${param.name}\\s*\\}\\}`, 'g');
  const replacement = overrides?.[param.name] ?? param.sampleValue ?? `{{${param.name}}}`;
  resolvedSubject = resolvedSubject.replace(regex, replacement);
  resolvedBody = resolvedBody.replace(regex, replacement);
 });

 return { subject: resolvedSubject, body: resolvedBody };
}
