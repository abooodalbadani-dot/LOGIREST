import { SetMetadata } from '@nestjs/common';

/**
 * @AllRoles — Opt-in decorator that marks an endpoint as intentionally open
 * to ALL authenticated users, bypassing the RolesGuard role check.
 *
 * Usage: Apply to @Get() read-only endpoints that should be accessible by
 * any authenticated user (VIEWER, AUDITOR, etc.).
 *
 * Without this decorator (and without @Roles()), RolesGuard will DEFAULT-DENY
 * the request with a 403 ForbiddenException.
 */
export const ALL_ROLES_KEY = 'all_roles';
export const AllRoles = () => SetMetadata(ALL_ROLES_KEY, true);
