import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../database/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { getQueueToken } from '@nestjs/bullmq';
import { ServiceUnavailableException } from '@nestjs/common';
import * as fs from 'fs';

jest.mock('fs');

describe('HealthController', () => {
  let controller: HealthController;
  let prismaMock: any;
  let redisMock: any;
  let queueMock: any;

  beforeEach(async () => {
    prismaMock = {
      $queryRaw: jest.fn().mockResolvedValue([1]),
      stockLedger: {
        count: jest.fn().mockResolvedValue(100),
      },
    };
    redisMock = {
      ping: jest.fn().mockResolvedValue('PONG'),
    };
    queueMock = {
      isPaused: jest.fn().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: REDIS_CLIENT,
          useValue: redisMock,
        },
        {
          provide: getQueueToken('outbox'),
          useValue: queueMock,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return status OK when all services are healthy', async () => {
    const result = await controller.check();
    expect(result.status).toBe('OK');
    expect(result.db).toBe('connected');
    expect(result.redis).toBe('connected');
    expect(result.bullmq).toBe('connected');
    expect(result.stockLedger).toBe('connected');
    expect(result.timestamp).toBeDefined();
  });

  it('should throw ServiceUnavailableException if DB query fails', async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error('DB Down'));
    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('should throw ServiceUnavailableException if Redis ping fails', async () => {
    redisMock.ping.mockRejectedValue(new Error('Redis Down'));
    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('should throw ServiceUnavailableException if BullMQ check fails', async () => {
    queueMock.isPaused.mockRejectedValue(new Error('BullMQ Down'));
    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('should throw ServiceUnavailableException if stockLedger count fails', async () => {
    prismaMock.stockLedger.count.mockRejectedValue(
      new Error('Table Access Failure'),
    );
    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  describe('checkBackup', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should throw ServiceUnavailableException if backup records do not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      await expect(controller.checkBackup()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw ServiceUnavailableException if backup is older than 26 hours', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('20200101_000000');
      await expect(controller.checkBackup()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should return status HEALTHY if backup is fresh (under 26 hours)', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const formattedDate = `${fiveHoursAgo.getFullYear()}${pad(fiveHoursAgo.getMonth() + 1)}${pad(fiveHoursAgo.getDate())}_${pad(fiveHoursAgo.getHours())}${pad(fiveHoursAgo.getMinutes())}${pad(fiveHoursAgo.getSeconds())}`;

      (fs.readFileSync as jest.Mock).mockReturnValue(formattedDate);

      const result = await controller.checkBackup();
      expect(result.status).toBe('HEALTHY');
      expect(result.ageHours).toBeLessThanOrEqual(26);
    });
  });
});
