import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    const isProduction = process.env.NODE_ENV === 'production';

    // Auth endpoints are public and have no cookie/token context yet — exempt them
    const url: string = req.url || req.originalUrl || '';
    const CSRF_EXEMPT_PREFIXES = ['/api/v1/auth/', '/health'];
    if (CSRF_EXEMPT_PREFIXES.some((prefix) => url.startsWith(prefix))) {
      return true;
    }

    // Generate and set XSRF-TOKEN cookie if it is missing
    let token = req.cookies?.['XSRF-TOKEN'] as string | undefined;
    if (!token) {
      token = crypto.randomBytes(32).toString('hex');
      res.cookie('XSRF-TOKEN', token, {
        secure: isProduction,
        sameSite: 'strict',
        path: '/',
        httpOnly: false, // JS must be able to read this cookie to send it as a header
      });
    }

    if (safeMethods.includes(req.method)) {
      return true;
    }

    // Bypass CSRF checks for client credentials, mobile apps, or API-key-driven integrations
    if (req.headers['authorization'] || req.headers['x-api-key']) {
      return true;
    }

    // Mutating methods check
    const headerToken = req.headers['x-xsrf-token'] as string | undefined;

    if (!token || !headerToken || token !== headerToken) {
      throw new ForbiddenException('Invalid or missing CSRF token');
    }

    return true;
  }
}
