/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { OutboxWorker } from './outbox.worker';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from './email.service';
import { Role } from '@prisma/client';
import { Job } from 'bullmq';

describe('OutboxWorker', () => {
  let worker: OutboxWorker;
  let mockPrisma: {
    outboxEvent: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let mockEmail: {
    sendEmail: jest.Mock;
  };

  beforeEach(async () => {
    mockPrisma = {
      outboxEvent: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    mockEmail = {
      sendEmail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxWorker,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: EmailService,
          useValue: mockEmail,
        },
      ],
    }).compile();

    worker = module.get<OutboxWorker>(OutboxWorker);
  });

  it('should skip processing if event is not found', async () => {
    mockPrisma.outboxEvent.findUnique.mockResolvedValue(null);

    const mockJob = {
      id: 'job-1',
      data: { eventId: 'event-1' },
    } as unknown as Job<{ eventId: string }>;

    await worker.process(mockJob);

    expect(mockPrisma.outboxEvent.findUnique).toHaveBeenCalledWith({
      where: { id: 'event-1' },
    });
    expect(mockEmail.sendEmail).not.toHaveBeenCalled();
  });

  it('should skip processing if event status is already SUCCEEDED', async () => {
    mockPrisma.outboxEvent.findUnique.mockResolvedValue({
      id: 'event-1',
      status: 'SUCCEEDED',
    });

    const mockJob = {
      id: 'job-1',
      data: { eventId: 'event-1' },
    } as unknown as Job<{ eventId: string }>;

    await worker.process(mockJob);

    expect(mockEmail.sendEmail).not.toHaveBeenCalled();
  });

  it('should process PR_SUBMITTED event and send emails to approvers', async () => {
    const mockEvent = {
      id: 'event-1',
      eventType: 'PR_SUBMITTED',
      payload: {
        id: 'pr-1',
        documentNumber: 'PR-2026-0001',
        warehouseName: 'Central',
      },
      status: 'PENDING',
      attempts: 0,
    };

    mockPrisma.outboxEvent.findUnique.mockResolvedValue(mockEvent);
    mockPrisma.user.findMany.mockResolvedValue([
      { email: 'approver1@example.com' },
      { email: 'approver2@example.com' },
    ]);

    const mockJob = {
      id: 'job-1',
      data: { eventId: 'event-1' },
    } as unknown as Job<{ eventId: string }>;

    await worker.process(mockJob);

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: {
        role: { in: [Role.APPROVER] },
        isActive: true,
      },
      select: { email: true },
    });

    expect(mockEmail.sendEmail).toHaveBeenCalledWith(
      ['approver1@example.com', 'approver2@example.com'],
      'Purchase Request PR-2026-0001 awaiting approval',
      expect.stringContaining('PR-2026-0001'),
    );

    expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: {
        status: 'SUCCEEDED',
        attempts: { increment: 1 },
        processedAt: expect.any(Date),
        lastError: null,
      },
    });
  });

  it('should increment attempts and remain PENDING when delivery fails (attempts < 3)', async () => {
    const mockEvent = {
      id: 'event-1',
      eventType: 'PR_SUBMITTED',
      payload: { id: 'pr-1' },
      status: 'PENDING',
      attempts: 1,
    };

    mockPrisma.outboxEvent.findUnique.mockResolvedValue(mockEvent);
    mockPrisma.user.findMany.mockResolvedValue([
      { email: 'approver1@example.com' },
    ]);
    mockEmail.sendEmail.mockRejectedValue(new Error('SMTP connection down'));

    const mockJob = {
      id: 'job-1',
      data: { eventId: 'event-1' },
    } as unknown as Job<{ eventId: string }>;

    await expect(worker.process(mockJob)).rejects.toThrow(
      'SMTP connection down',
    );

    expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: {
        status: 'PENDING',
        attempts: 2,
        lastError: 'SMTP connection down',
      },
    });
  });

  it('should mark as FAILED when delivery fails and attempts reach limit (attempts >= 3)', async () => {
    const mockEvent = {
      id: 'event-1',
      eventType: 'PR_SUBMITTED',
      payload: { id: 'pr-1' },
      status: 'PENDING',
      attempts: 2,
    };

    mockPrisma.outboxEvent.findUnique.mockResolvedValue(mockEvent);
    mockPrisma.user.findMany.mockResolvedValue([
      { email: 'approver1@example.com' },
    ]);
    mockEmail.sendEmail.mockRejectedValue(new Error('SMTP connection down'));

    const mockJob = {
      id: 'job-1',
      data: { eventId: 'event-1' },
    } as unknown as Job<{ eventId: string }>;

    // Should NOT throw because it is marked as FAILED and won't retry
    await worker.process(mockJob);

    expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: {
        status: 'FAILED',
        attempts: 3,
        lastError: 'SMTP connection down',
      },
    });
  });
});
