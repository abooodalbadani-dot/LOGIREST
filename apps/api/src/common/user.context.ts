import { AsyncLocalStorage } from 'async_hooks';

export interface UserContextData {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export const userContextStorage = new AsyncLocalStorage<UserContextData>();

export function getCurrentUserContext(): UserContextData | undefined {
  return userContextStorage.getStore();
}
