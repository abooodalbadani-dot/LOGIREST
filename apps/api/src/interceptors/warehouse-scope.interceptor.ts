import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../database/prisma.service';
import { Role } from '@prisma/client';
import type { Request } from 'express';

interface AuthenticatedUser {
  id: string;
  role: Role;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  allowedWarehouseIds?: string[];
}

@Injectable()
export class WarehouseScopeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(WarehouseScopeInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      return next.handle();
    }

    if (user.role === Role.ADMIN) {
      request.allowedWarehouseIds = undefined;
      return next.handle();
    }

    const scopes = await this.prisma.userWarehouseScope.findMany({
      where: { userId: user.id },
      select: { warehouseId: true },
    });

    request.allowedWarehouseIds = scopes.map((s) => s.warehouseId);
    return next.handle();
  }
}
