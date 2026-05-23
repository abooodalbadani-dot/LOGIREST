/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { ConcurrencyService } from './concurrency.service';
import { PrismaService } from '../database/prisma.service';
import { VersionConflictException } from '../exceptions/version-conflict.exception';
import { NotFoundException } from '@nestjs/common';

describe('ConcurrencyService', () => {
  let service: ConcurrencyService;

  const mockPrisma = {
    auditLog: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    // We will dynamically add model mocks since handleConflict does this.prisma[modelName]
    purchaseRequest: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConcurrencyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ConcurrencyService>(ConcurrencyService);
    jest.clearAllMocks();
  });

  it('should throw NotFoundException if the document does not exist', async () => {
    mockPrisma.purchaseRequest.findUnique.mockResolvedValue(null);

    await expect(
      service.handleConflict('doc-1', 'purchaseRequest', 1),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw VersionConflictException with details from the audit log if found', async () => {
    const mockDoc = { id: 'doc-1', version: 2, createdById: 'user-1' };
    const mockAuditLog = {
      createdAt: new Date('2026-05-23T00:00:00Z'),
      userId: 'user-2',
      user: { name: 'Jane Doe' },
    };

    mockPrisma.purchaseRequest.findUnique.mockResolvedValue(mockDoc);
    mockPrisma.auditLog.findFirst.mockResolvedValue(mockAuditLog);

    try {
      await service.handleConflict('doc-1', 'purchaseRequest', 1);
      fail('Expected handleConflict to throw VersionConflictException');
    } catch (error) {
      expect(error).toBeInstanceOf(VersionConflictException);
      const response = (error as VersionConflictException).getResponse() as any;
      expect(response.statusCode).toBe(409);
      expect(response.currentVersion).toBe(2);
      expect(response.lastModifiedBy).toBe('Jane Doe');
      expect(response.lastModifiedAt).toEqual(mockAuditLog.createdAt);
    }
  });

  it('should fall back to checking the user table for document creator if audit log is missing', async () => {
    const mockDoc = { id: 'doc-1', version: 2, createdById: 'user-1' };
    mockPrisma.purchaseRequest.findUnique.mockResolvedValue(mockDoc);
    mockPrisma.auditLog.findFirst.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({ name: 'John Doe' });

    try {
      await service.handleConflict('doc-1', 'purchaseRequest', 1);
      fail('Expected handleConflict to throw VersionConflictException');
    } catch (error) {
      expect(error).toBeInstanceOf(VersionConflictException);
      const response = (error as VersionConflictException).getResponse() as any;
      expect(response.statusCode).toBe(409);
      expect(response.currentVersion).toBe(2);
      expect(response.lastModifiedBy).toBe('John Doe');
      expect(response.lastModifiedAt).toBeInstanceOf(Date);
    }
  });

  it('should fall back to System if audit log and creator details are missing', async () => {
    const mockDoc = { id: 'doc-1', version: 2, createdById: null };
    mockPrisma.purchaseRequest.findUnique.mockResolvedValue(mockDoc);
    mockPrisma.auditLog.findFirst.mockResolvedValue(null);

    try {
      await service.handleConflict('doc-1', 'purchaseRequest', 1);
      fail('Expected handleConflict to throw VersionConflictException');
    } catch (error) {
      expect(error).toBeInstanceOf(VersionConflictException);
      const response = (error as VersionConflictException).getResponse() as any;
      expect(response.statusCode).toBe(409);
      expect(response.currentVersion).toBe(2);
      expect(response.lastModifiedBy).toBe('Unknown');
      expect(response.lastModifiedAt).toBeInstanceOf(Date);
    }
  });
});
