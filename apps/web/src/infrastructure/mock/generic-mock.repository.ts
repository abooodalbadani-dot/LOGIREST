import { z } from 'zod';
import { StorageDriver } from '../storage/storage.interface';
import { IRepository } from './repository.interface';

export class GenericMockRepository<T extends { id: string | number }> implements IRepository<T> {
  constructor(
    private storage: StorageDriver,
    private key: string,
    private schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    private defaultData: T[] = []
  ) {
    this.init();
  }

  private init() {
    const existing = this.storage.get<T[]>(this.key);
    if (!existing) {
      this.storage.set(this.key, this.defaultData);
    }
  }

  async findAll(): Promise<T[]> {
    const data = this.storage.get<T[]>(this.key) || [];
    return data.map(item => this.schema.parse(item));
  }

  async findById(id: string | number): Promise<T | null> {
    const data = await this.findAll();
    const item = data.find(i => i?.id === id);
    return item ? this.schema.parse(item) : null;
  }

  async save(item: T): Promise<T> {
    const validated = this.schema.parse(item);
    const data = await this.findAll();
    const index = data.findIndex(i => i.id === validated.id);

    if (index >= 0) {
      data[index] = validated;
    } else {
      data.push(validated);
    }

    this.storage.set(this.key, data);
    return validated;
  }

  async saveAll(items: T[]): Promise<T[]> {
    const validated = items.map(i => this.schema.parse(i));
    this.storage.set(this.key, validated);
    return validated;
  }

  async delete(id: string | number): Promise<void> {
    const data = await this.findAll();
    const filtered = data.filter(i => i.id !== id);
    this.storage.set(this.key, filtered);
  }
}
