import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsController } from './audit-logs.controller';
import { PrismaService } from '../../database/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('AuditLogsController', () => {
  let controller: AuditLogsController;

  const mockPrismaService = {
    auditLog: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [{ provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
    jest.clearAllMocks();
  });

  it('should return paginated and mapped audit logs for ADMIN', async () => {
    mockPrismaService.auditLog.count.mockResolvedValue(1);
    mockPrismaService.auditLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        createdAt: new Date(),
        userId: 'admin-1',
        user: { role: Role.ADMIN },
        beforeStateJson: JSON.stringify({ status: 'ACTIVE', isActive: true }),
        afterStateJson: JSON.stringify({ status: 'RELEASED', isActive: false }),
      },
    ]);

    const result = await controller.getAuditLogs({
      page: 1,
      limit: 50,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual({
      id: 'log-1',
      createdAt: expect.any(Date),
      performedByUserId: 'admin-1',
      performedByRole: Role.ADMIN,
      beforeStateJson: { status: 'ACTIVE', isActive: true },
      afterStateJson: { status: 'RELEASED', isActive: false },
    });
    expect(result.meta).toEqual({
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });
  });

  it('should return paginated and mapped audit logs for INV_MGR', async () => {
    mockPrismaService.auditLog.count.mockResolvedValue(1);
    mockPrismaService.auditLog.findMany.mockResolvedValue([
      {
        id: 'log-2',
        createdAt: new Date(),
        userId: 'mgr-1',
        user: { role: Role.INV_MGR },
        beforeStateJson: null,
        afterStateJson: JSON.stringify({ status: 'RELEASED', isActive: false }),
      },
    ]);

    const result = await controller.getAuditLogs({
      page: 1,
      limit: 50,
      userId: 'mgr-1',
    });

    expect(result.data[0].performedByRole).toBe(Role.INV_MGR);
    expect(result.data[0].beforeStateJson).toBeNull();
  });

  it('should return paginated and mapped audit logs for AUDITOR', async () => {
    mockPrismaService.auditLog.count.mockResolvedValue(1);
    mockPrismaService.auditLog.findMany.mockResolvedValue([
      {
        id: 'log-3',
        createdAt: new Date(),
        userId: 'auditor-1',
        user: { role: Role.AUDITOR },
        beforeStateJson: null,
        afterStateJson: JSON.stringify({ status: 'RELEASED', isActive: false }),
      },
    ]);

    const result = await controller.getAuditLogs({
      page: 1,
      limit: 50,
    });

    expect(result.data[0].performedByRole).toBe(Role.AUDITOR);
  });
});
