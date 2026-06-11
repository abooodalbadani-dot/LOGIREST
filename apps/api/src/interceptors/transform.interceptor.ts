import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data: unknown) => this.transform(data)));
  }

  private transform(data: any): any {
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
      return data.map((item) => this.transform(item));
    }

    // Recursively handle objects
    if (typeof data === 'object') {
      const result: Record<string, any> = {};

      // 2. Name field fallback logic (if generic 'name' is missing)
      const hasName = 'name' in data;
      const nameEn = data.name_en !== undefined ? data.name_en : data.nameEn;
      const nameAr = data.name_ar !== undefined ? data.name_ar : data.nameAr;

      let fallbackName: any = undefined;
      if (!hasName) {
        if (nameEn !== undefined && nameEn !== null) {
          fallbackName = nameEn;
        } else if (nameAr !== undefined && nameAr !== null) {
          fallbackName = nameAr;
        }
      }

      for (const key of Object.keys(data)) {
        const value = data[key];
        const camelKey = this.toCamelCase(key);

        if (value === null || value === undefined) {
          result[camelKey] = value;
        } else if (camelKey === 'meta' && value && typeof value === 'object') {
          result[camelKey] = {
            ...this.transform(value),
            page: Number(value.page || 1),
            pageSize: Number(value.pageSize || 50),
            total: Number(value.total || 0),
            totalPages: Number(value.totalPages || 1),
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
