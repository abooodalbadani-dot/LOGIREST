import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class MetricsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers['x-metrics-token'] as string | undefined;
    const expectedToken =
      process.env.METRICS_TOKEN || process.env.METRICS_SECRET;

    if (!expectedToken) {
      throw new ForbiddenException('Metrics token not configured on server');
    }

    if (!token || token !== expectedToken) {
      throw new ForbiddenException('Invalid or missing metrics token');
    }

    return true;
  }
}
