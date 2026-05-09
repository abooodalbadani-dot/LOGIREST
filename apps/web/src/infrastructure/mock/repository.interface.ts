export interface IRepository<T> {
  findAll(): Promise<T[]>;
  findById(id: string | number): Promise<T | null>;
  save(item: T): Promise<T>;
  saveAll(items: T[]): Promise<T[]>;
  delete(id: string | number): Promise<void>;
}
