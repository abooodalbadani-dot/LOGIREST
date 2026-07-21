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

  async getNotifications(role: Role, warehouseId?: string) {
    return this.prisma.notificationLog.findMany({
      where: {
        targetRole: role,
        isRead: false,
        OR: [{ warehouseId: null }, { warehouseId: warehouseId || undefined }],
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notificationLog.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(role: Role, warehouseId?: string) {
    const result = await this.prisma.notificationLog.updateMany({
      where: {
        targetRole: role,
        isRead: false,
        OR: [{ warehouseId: null }, { warehouseId: warehouseId || undefined }],
      },
      data: { isRead: true },
    });
    return { count: result.count };
  }
}
