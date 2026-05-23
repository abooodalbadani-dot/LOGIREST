import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../database/prisma.service';
import { Role, DocumentType } from '@prisma/client';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockPrismaService = {
    notificationLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should insert a notification log into the database', async () => {
      const mockNotification = {
        id: 'notif-1',
        targetRole: Role.APPROVER,
        warehouseId: 'wh-1',
        message: 'A new PR has been submitted.',
        isRead: false,
        documentType: DocumentType.PURCHASE_REQUEST,
        documentId: 'pr-1',
        createdAt: new Date(),
      };
      mockPrismaService.notificationLog.create.mockResolvedValue(mockNotification);

      const result = await service.createNotification({
        targetRole: Role.APPROVER,
        warehouseId: 'wh-1',
        message: 'A new PR has been submitted.',
        documentType: DocumentType.PURCHASE_REQUEST,
        documentId: 'pr-1',
      });

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notificationLog.create).toHaveBeenCalledWith({
        data: {
          targetRole: Role.APPROVER,
          warehouseId: 'wh-1',
          message: 'A new PR has been submitted.',
          documentType: DocumentType.PURCHASE_REQUEST,
          documentId: 'pr-1',
        },
      });
    });
  });

  describe('getNotifications', () => {
    it('should query unread notifications filtered by target role and warehouse scope', async () => {
      const mockList = [
        {
          id: 'notif-1',
          targetRole: Role.WH_KEEPER,
          warehouseId: 'wh-1',
          message: 'Transfer shipped',
          isRead: false,
        },
      ];
      mockPrismaService.notificationLog.findMany.mockResolvedValue(mockList);

      const result = await service.getNotifications(Role.WH_KEEPER, 'wh-1');

      expect(result).toEqual(mockList);
      expect(mockPrismaService.notificationLog.findMany).toHaveBeenCalledWith({
        where: {
          targetRole: Role.WH_KEEPER,
          isRead: false,
          OR: [
            { warehouseId: null },
            { warehouseId: 'wh-1' },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark a single notification as read', async () => {
      const mockUpdated = { id: 'notif-1', isRead: true };
      mockPrismaService.notificationLog.update.mockResolvedValue(mockUpdated);

      const result = await service.markAsRead('notif-1');

      expect(result).toEqual(mockUpdated);
      expect(mockPrismaService.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isRead: true },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread matching notifications to read', async () => {
      mockPrismaService.notificationLog.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead(Role.APPROVER, 'wh-1');

      expect(result).toEqual({ count: 5 });
      expect(mockPrismaService.notificationLog.updateMany).toHaveBeenCalledWith({
        where: {
          targetRole: Role.APPROVER,
          isRead: false,
          OR: [
            { warehouseId: null },
            { warehouseId: 'wh-1' },
          ],
        },
        data: { isRead: true },
      });
    });
  });
});
