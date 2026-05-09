'use client';

import { toast } from 'sonner';

export { toast };

export function useToast(): { toast: typeof toast } {
 return { toast };
}
