import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { correlationStorage } from './correlation.context';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const rawCorrelationId =
      req.headers['x-correlation-id'] || req.headers['x-request-id'];
    const correlationId = Array.isArray(rawCorrelationId)
      ? rawCorrelationId[0]
      : (rawCorrelationId as string) || crypto.randomUUID();

    // Ensure it is on both request and response headers
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    correlationStorage.run(correlationId, () => {
      next();
    });
  }
}
