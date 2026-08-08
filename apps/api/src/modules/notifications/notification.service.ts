import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Role, DocumentType } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(data: {
    targetRole: Role;
    warehouseId?: string;
    message: string;
    documentType?: DocumentType;
    documentId?: string;
  }) {
    // Ensure all WH_KEEPER notifications are also sent to INV_MGR
    if (data.targetRole === Role.WH_KEEPER) {
      await this.prisma.notificationLog.create({
        data: {
          targetRole: Role.INV_MGR,
          warehouseId: data.warehouseId || null,
          message: data.message,
          documentType: data.documentType || null,
          documentId: data.documentId || null,
        },
      });
    }

    return this.prisma.notificationLog.create({
      data: {
        targetRole: data.targetRole,
        warehouseId: data.warehouseId || null,
        message: data.message,
        documentType: data.documentType || null,
        documentId: data.documentId || null,
      },
    });
  }

  private async getAuthorizedWarehouseIds(userId: string): Promise<Set<string>> {
    const [whScopes, branchScopes, deptScopes] = await Promise.all([
      this.prisma.userWarehouseScope.findMany({
        where: { userId },
        select: { warehouseId: true },
      }),
      this.prisma.userBranchScope.findMany({
        where: { userId },
        select: { branchId: true },
      }),
      this.prisma.userDepartmentScope.findMany({
        where: { userId },
        include: { department: { select: { branchId: true } } },
      }),
    ]);

    const authorizedWhIds = new Set<string>(whScopes.map((s) => s.warehouseId));
    const branchIds = [
      ...branchScopes.map((b) => b.branchId),
      ...deptScopes.map((d) => d.department.branchId),
    ];

    if (branchIds.length > 0) {
      const branchWhs = await this.prisma.warehouse.findMany({
        where: { branchId: { in: branchIds } },
        select: { id: true },
      });
      branchWhs.forEach((w) => authorizedWhIds.add(w.id));
    }

    return authorizedWhIds;
  }

  async getNotifications(role: Role, userId?: string, activeWarehouseId?: string) {
    if (role === Role.ADMIN || role === Role.GM || !userId) {
      return this.prisma.notificationLog.findMany({
        where: {
          targetRole: role,
          isRead: false,
          ...(activeWarehouseId
            ? { OR: [{ warehouseId: null }, { warehouseId: activeWarehouseId }] }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    const authorizedWhIds = await this.getAuthorizedWarehouseIds(userId);
    const whIdList = Array.from(authorizedWhIds);

    const allowedWhIds = activeWarehouseId
      ? (authorizedWhIds.has(activeWarehouseId) ? [activeWarehouseId] : [])
      : whIdList;

    return this.prisma.notificationLog.findMany({
      where: {
        targetRole: role,
        isRead: false,
        OR: [
          { warehouseId: null },
          { warehouseId: { in: allowedWhIds } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notificationLog.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(role: Role, userId?: string, activeWarehouseId?: string) {
    if (role === Role.ADMIN || role === Role.GM || !userId) {
      const result = await this.prisma.notificationLog.updateMany({
        where: {
          targetRole: role,
          isRead: false,
          ...(activeWarehouseId
            ? { OR: [{ warehouseId: null }, { warehouseId: activeWarehouseId }] }
            : {}),
        },
        data: { isRead: true },
      });
      return { count: result.count };
    }

    const authorizedWhIds = await this.getAuthorizedWarehouseIds(userId);
    const whIdList = Array.from(authorizedWhIds);

    const allowedWhIds = activeWarehouseId
      ? (authorizedWhIds.has(activeWarehouseId) ? [activeWarehouseId] : [])
      : whIdList;

    const result = await this.prisma.notificationLog.updateMany({
      where: {
        targetRole: role,
        isRead: false,
        OR: [
          { warehouseId: null },
          { warehouseId: { in: allowedWhIds } },
        ],
      },
      data: { isRead: true },
    });
    return { count: result.count };
  }
}
