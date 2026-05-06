import { StorageDriver } from './storage.interface';

export class MemoryStorageDriver implements StorageDriver {
  private storage = new Map<string, string>();

  get<T>(key: string): T | null {
    const item = this.storage.get(key);
    if (!item) return null;
    try {
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    this.storage.set(key, JSON.stringify(value));
  }

  remove(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }
}
