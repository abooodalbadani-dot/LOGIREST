import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

describe('SearchController', () => {
  let controller: SearchController;

  const mockPrisma = {
    item: { findMany: jest.fn() },
    supplier: { findMany: jest.fn() },
    lot: { findMany: jest.fn() },
    goodsReceivedNote: { findMany: jest.fn() },
    purchaseOrder: { findMany: jest.fn() },
    transfer: { findMany: jest.fn() },
    inventoryIssue: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
  });

  it('should return empty array if query is empty', async () => {
    const res = await controller.search('', {} as unknown as Request);
    expect(res).toEqual([]);
  });

  it('should throw BadRequestException if query is too short (< 2 chars)', async () => {
    await expect(
      controller.search('a', {} as unknown as Request),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if query is too long (> 100 chars)', async () => {
    const longQuery = 'a'.repeat(101);
    await expect(
      controller.search(longQuery, {} as unknown as Request),
    ).rejects.toThrow(BadRequestException);
  });

  it('should call prisma findMany with correct arguments if query is valid', async () => {
    mockPrisma.item.findMany.mockResolvedValue([]);
    mockPrisma.supplier.findMany.mockResolvedValue([]);
    mockPrisma.lot.findMany.mockResolvedValue([]);
    mockPrisma.goodsReceivedNote.findMany.mockResolvedValue([]);
    mockPrisma.purchaseOrder.findMany.mockResolvedValue([]);
    mockPrisma.transfer.findMany.mockResolvedValue([]);
    mockPrisma.inventoryIssue.findMany.mockResolvedValue([]);

    const res = await controller.search(
      'valid-query',
      {} as unknown as Request,
    );
    expect(res).toEqual([]);
    expect(mockPrisma.item.findMany).toHaveBeenCalled();
  });
});
