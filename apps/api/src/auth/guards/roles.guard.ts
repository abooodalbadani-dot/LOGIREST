import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ALL_ROLES_KEY } from '../decorators/all-roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Explicit opt-in: @AllRoles() marks endpoints open to ALL authenticated users.
    const isAllRoles = this.reflector.getAllAndOverride<boolean>(
      ALL_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isAllRoles) return true;

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // SECURITY: Default Deny — endpoints must be explicitly annotated with
    // @Roles(...) or @AllRoles(). Any endpoint missing both decorators is
    // treated as misconfigured and immediately denied.
    if (!requiredRoles || requiredRoles.length === 0) {
      const request = context.switchToHttp().getRequest<{
        method: string;
        path?: string;
        url?: string;
      }>();
      this.logger.error(
        `[SECURITY] Endpoint is missing @Roles() or @AllRoles() decorator — ` +
          `denying access. Method: ${request.method} | Path: ${request.path ?? request.url}. ` +
          `Add @Roles(...roles) to restrict or @AllRoles() to allow all authenticated users.`,
      );
      throw new ForbiddenException(
        'This endpoint is not configured with an access control decorator. Access denied.',
      );
    }

    const request = context.switchToHttp().getRequest<{
      user?: { role: Role };
      method: string;
      path?: string;
      url?: string;
    }>();
    const user = request.user;
    if (!user) return false;

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      this.logger.warn(
        `Unauthorized access attempt. Role: ${user.role} | Method: ${request.method} | Path: ${request.path ?? request.url}`,
      );
      throw new ForbiddenException(
        'You do not have the required role to access this resource.',
      );
    }
    return true;
  }
}
