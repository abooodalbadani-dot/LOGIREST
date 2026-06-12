import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CamelToSnakeMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (
      req.body &&
      typeof req.body === 'object' &&
      Object.keys(req.body as Record<string, unknown>).length > 0
    ) {
      req.body = this.transform(req.body) as Record<string, unknown>;
    }
    next();
  }

  private transform(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (data instanceof Date) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item: unknown) => this.transform(item));
    }

    if (typeof data === 'object') {
      const result: Record<string, unknown> = {};
      const obj = data as Record<string, unknown>;

      for (const key of Object.keys(obj)) {
        const value = obj[key];
        const snakeKey = this.toSnakeCase(key);

        if (value === null || value === undefined) {
          result[snakeKey] = value;
        } else {
          result[snakeKey] = this.transform(value);
        }
      }

      return result;
    }

    return data;
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
