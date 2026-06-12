import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  meta?: unknown;
}

@Injectable()
export class TransformInterceptor<T = unknown> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<Response<T>> {
    return next
      .handle()
      .pipe(map((data: T) => this.transform(data) as Response<T>));
  }

  private transform(data: unknown): unknown {
    // 3. Ignore null and undefined values
    if (data === null || data === undefined) {
      return data;
    }

    // 3. Ignore Date objects
    if (data instanceof Date) {
      return data;
    }

    // Recursively handle arrays
    if (Array.isArray(data)) {
      return data.map((item: unknown) => this.transform(item));
    }

    // Recursively handle objects
    if (typeof data === 'object') {
      const result: Record<string, unknown> = {};
      const obj = data as Record<string, unknown>;

      // 2. Name field fallback logic (if generic 'name' is missing)
      const hasName = 'name' in obj;
      const nameEn = obj.name_en !== undefined ? obj.name_en : obj.nameEn;
      const nameAr = obj.name_ar !== undefined ? obj.name_ar : obj.nameAr;

      let fallbackName: unknown = undefined;
      if (!hasName) {
        if (nameEn !== undefined && nameEn !== null) {
          fallbackName = nameEn;
        } else if (nameAr !== undefined && nameAr !== null) {
          fallbackName = nameAr;
        }
      }

      for (const key of Object.keys(obj)) {
        const value = obj[key];
        const camelKey = this.toCamelCase(key);

        if (value === null || value === undefined) {
          result[camelKey] = value;
        } else if (camelKey === 'meta' && value && typeof value === 'object') {
          const metaObj = value as Record<string, unknown>;
          result[camelKey] = {
            ...(this.transform(value) as Record<string, unknown>),
            page: Number(metaObj.page || 1),
            pageSize: Number(metaObj.pageSize || 50),
            total: Number(metaObj.total || 0),
            totalPages: Number(metaObj.totalPages || 1),
          };
        } else {
          result[camelKey] = this.transform(value);
        }
      }

      // Inject fallback name if it exists and 'name' is not present in the final object
      if (!('name' in result) && fallbackName !== undefined) {
        result['name'] = fallbackName;
      }

      return result;
    }

    return data;
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
  }
}
