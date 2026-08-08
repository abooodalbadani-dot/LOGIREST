import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string };
  activeScope?: { warehouseId?: string; branchId?: string };
}

/**
 * Step 2: Backend Scope Guard (Fail-Fast)
 * 
 * Validates that the targeted document's actual warehouseId matches the user's active request header (x-warehouse-id).
 * Rejects cross-scope mutations with 403 Forbidden (Scope Mismatch).
 */
@Injectable()
export class DocumentScopeGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Extract active warehouse header passed from active user scope
    const rawHeader = request.headers['x-warehouse-id'];
    const headerWarehouseId =
      (Array.isArray(rawHeader) ? rawHeader[0] : rawHeader) ||
      request.activeScope?.warehouseId;

    const documentId = Array.isArray(request.params?.id)
      ? request.params?.id[0]
      : request.params?.id;

    // If endpoint doesn't target a specific document ID, pass validation
    if (!documentId) {
      return true;
    }

    // Role exemption for global roles (ADMIN, GM)
    const userRole = request.user?.role;
    if (userRole === 'ADMIN' || userRole === 'GM') {
      return true;
    }

    if (!headerWarehouseId) {
      throw new BadRequestException('Missing active warehouse scope header (x-warehouse-id)');
    }

    const url = request.url || request.originalUrl || '';
    let documentWarehouseId: string | null = null;

    if (url.includes('/adjustments')) {
      const doc = await this.prisma.adjustment.findUnique({
        where: { id: documentId },
        select: { warehouseId: true },
      });
      documentWarehouseId = doc?.warehouseId ?? null;
    } else if (url.includes('/goods-received') || url.includes('/grn')) {
      const doc = await this.prisma.goodsReceivedNote.findUnique({
        where: { id: documentId },
        select: { warehouseId: true },
      });
      documentWarehouseId = doc?.warehouseId ?? null;
    } else if (url.includes('/issues')) {
      const doc = await this.prisma.inventoryIssue.findUnique({
        where: { id: documentId },
        select: { warehouseId: true },
      });
      documentWarehouseId = doc?.warehouseId ?? null;
    } else if (url.includes('/transfers')) {
      const doc = await this.prisma.transfer.findUnique({
        where: { id: documentId },
        select: { fromWarehouseId: true, toWarehouseId: true },
      });
      if (doc) {
        if (doc.fromWarehouseId === headerWarehouseId || doc.toWarehouseId === headerWarehouseId) {
          return true;
        }
        throw new ForbiddenException(
          `Scope Mismatch: Document #${documentId} belongs to warehouses (${doc.fromWarehouseId} / ${doc.toWarehouseId}) but active header is ${headerWarehouseId}`
        );
      }
    } else if (url.includes('/stocktake')) {
      const doc = await this.prisma.stocktakeSession.findUnique({
        where: { id: documentId },
        select: { warehouseId: true },
      });
      documentWarehouseId = doc?.warehouseId ?? null;
    }

    // Fail-fast if document exists and its warehouse does not match the active header scope
    if (documentWarehouseId && documentWarehouseId !== headerWarehouseId) {
      throw new ForbiddenException(
        `Scope Mismatch: Document #${documentId} belongs to Warehouse ${documentWarehouseId}, but active scope is ${headerWarehouseId}`
      );
    }

    return true;
  }
}
