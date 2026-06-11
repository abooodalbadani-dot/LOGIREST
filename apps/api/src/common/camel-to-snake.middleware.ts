import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CamelToSnakeMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (
      req.body &&
      typeof req.body === 'object' &&
      Object.keys(req.body).length > 0
    ) {
      req.body = this.transform(req.body);
    }
    next();
  }

  private transform(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (data instanceof Date) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.transform(item));
    }

    if (typeof data === 'object') {
      const result: Record<string, any> = {};

      for (const key of Object.keys(data)) {
        const value = data[key];
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
