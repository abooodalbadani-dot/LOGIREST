import { Test, TestingModule } from '@nestjs/testing';
import { FXRatesController } from './fx-rates.controller';
import { PrismaService } from '../../../database/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateFXRateDto, UpdateFXRateDto } from './dto/create-fx-rate.dto';
import type { Request } from 'express';
import { Role } from '@prisma/client';

describe('FXRatesController', () => {
  let controller: FXRatesController;

  const mockCurrencyFindUnique = jest.fn();
  const mockFXRateCreate = jest.fn();
  const mockFXRateUpdateMany = jest.fn();
  const mockFXRateFindUnique = jest.fn();
  const mockFXRateUpdate = jest.fn();
  const mockFXRateFindMany = jest.fn();
  const mockAuditLogCreate = jest.fn();

  const mockPrismaService = {
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
    currency: {
      findUnique: mockCurrencyFindUnique,
    },
    fXRate: {
      create: mockFXRateCreate,
      updateMany: mockFXRateUpdateMany,
      findUnique: mockFXRateFindUnique,
      update: mockFXRateUpdate,
      findMany: mockFXRateFindMany,
    },
    auditLog: {
      create: mockAuditLogCreate,
    },
  } as unknown as PrismaService;

  const mockRequest = {
    headers: {},
    ip: '127.0.0.1',
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FXRatesController],
      providers: [{ provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    controller = module.get<FXRatesController>(FXRatesController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto: CreateFXRateDto = {
      fromCurrencyId: 'curr-1',
      toCurrencyId: 'curr-2',
      rate: 1.5,
      effectiveFrom: '2026-06-25T00:00:00.000Z',
      isActive: true,
    };

    it('should throw BadRequestException if rate <= 0', async () => {
      const invalidDto = { ...dto, rate: -0.5 };
      await expect(
        controller.create(invalidDto, 'user-1', mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if fromCurrencyId does not exist', async () => {
      mockCurrencyFindUnique.mockResolvedValueOnce(null); // fromCurrency
      await expect(
        controller.create(dto, 'user-1', mockRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if toCurrencyId does not exist', async () => {
      mockCurrencyFindUnique
        .mockResolvedValueOnce({ id: 'curr-1' }) // fromCurrency
        .mockResolvedValueOnce(null); // toCurrency
      await expect(
        controller.create(dto, 'user-1', mockRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if source and target currencies are identical', async () => {
      const sameCurrencyDto = { ...dto, toCurrencyId: 'curr-1' };
      mockCurrencyFindUnique
        .mockResolvedValueOnce({ id: 'curr-1' })
        .mockResolvedValueOnce({ id: 'curr-1' });

      await expect(
        controller.create(sameCurrencyDto, 'user-1', mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should deactivate old active rates and insert new active rate & its inverse rate', async () => {
      mockCurrencyFindUnique
        .mockResolvedValueOnce({ id: 'curr-1' }) // fromCurrency
        .mockResolvedValueOnce({ id: 'curr-2' }); // toCurrency

      mockFXRateCreate
        .mockResolvedValueOnce({
          id: 'rate-1',
          fromCurrencyId: 'curr-1',
          toCurrencyId: 'curr-2',
          rate: 1.5,
          isActive: true,
        }) // original FX rate creation
        .mockResolvedValueOnce({
          id: 'rate-1-inv',
          fromCurrencyId: 'curr-2',
          toCurrencyId: 'curr-1',
          rate: 0.66666667,
          isActive: true,
        }); // inverse FX rate creation

      mockFXRateFindUnique.mockResolvedValueOnce(null); // no existing inverse rate

      const result = await controller.create(dto, 'user-1', mockRequest);

      // Verify old rates for both direct and inverse pairs were deactivated
      expect(mockFXRateUpdateMany).toHaveBeenCalledTimes(2);
      expect(mockFXRateUpdateMany).toHaveBeenNthCalledWith(1, {
        where: {
          fromCurrencyId: 'curr-1',
          toCurrencyId: 'curr-2',
          isActive: true,
        },
        data: { isActive: false },
      });
      expect(mockFXRateUpdateMany).toHaveBeenNthCalledWith(2, {
        where: {
          fromCurrencyId: 'curr-2',
          toCurrencyId: 'curr-1',
          isActive: true,
        },
        data: { isActive: false },
      });

      // Verify the new rates were created
      expect(mockFXRateCreate).toHaveBeenCalledTimes(2);
      expect(mockFXRateCreate).toHaveBeenNthCalledWith(1, {
        data: {
          fromCurrencyId: 'curr-1',
          toCurrencyId: 'curr-2',
          rate: 1.5,
          effectiveFrom: new Date(dto.effectiveFrom),
          isActive: true,
        },
      });

      expect(mockFXRateCreate).toHaveBeenNthCalledWith(2, {
        data: {
          fromCurrencyId: 'curr-2',
          toCurrencyId: 'curr-1',
          rate: 0.66666667, // 1 / 1.5 rounded to 8 decimals
          effectiveFrom: new Date(dto.effectiveFrom),
          isActive: true,
          version: 1,
        },
      });

      expect(result.id).toEqual('rate-1');
    });
  });

  describe('update', () => {
    const dto: UpdateFXRateDto = {
      fromCurrencyId: 'curr-1',
      toCurrencyId: 'curr-2',
      rate: 2.0,
      effectiveFrom: '2026-06-25T00:00:00.000Z',
      isActive: true,
      version: 1,
    };

    it('should throw NotFoundException if the rate does not exist', async () => {
      mockFXRateFindUnique.mockResolvedValueOnce(null);
      await expect(
        controller.update('rate-1', dto, 'user-1', mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException on version mismatch', async () => {
      mockFXRateFindUnique.mockResolvedValueOnce({
        id: 'rate-1',
        version: 2,
      });

      await expect(
        controller.update('rate-1', dto, 'user-1', mockRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update active rate and deactivate other active rates', async () => {
      mockFXRateFindUnique
        .mockResolvedValueOnce({
          id: 'rate-1',
          fromCurrencyId: 'curr-1',
          toCurrencyId: 'curr-2',
          effectiveFrom: new Date('2026-06-24T00:00:00.000Z'),
          rate: 1.5,
          version: 1,
        }) // Check existing
        .mockResolvedValueOnce({
          id: 'rate-1-inv-old',
          fromCurrencyId: 'curr-2',
          toCurrencyId: 'curr-1',
          effectiveFrom: new Date('2026-06-24T00:00:00.000Z'),
          rate: 0.66666667,
          version: 1,
        }); // Find old inverse

      mockCurrencyFindUnique
        .mockResolvedValueOnce({ id: 'curr-1' })
        .mockResolvedValueOnce({ id: 'curr-2' });

      mockFXRateUpdate
        .mockResolvedValueOnce({
          id: 'rate-1',
          fromCurrencyId: 'curr-1',
          toCurrencyId: 'curr-2',
          rate: 2.0,
          isActive: true,
          version: 2,
        }) // update original
        .mockResolvedValueOnce({
          id: 'rate-1-inv-old',
          fromCurrencyId: 'curr-2',
          toCurrencyId: 'curr-1',
          rate: 0.5,
          isActive: true,
          version: 2,
        }); // update inverse

      const result = await controller.update(
        'rate-1',
        dto,
        'user-1',
        mockRequest,
      );

      // Verify that other active rates (except this rate / old inverse rate) were deactivated
      expect(mockFXRateUpdateMany).toHaveBeenCalledTimes(2);
      expect(mockFXRateUpdateMany).toHaveBeenNthCalledWith(1, {
        where: {
          fromCurrencyId: 'curr-1',
          toCurrencyId: 'curr-2',
          isActive: true,
          id: { not: 'rate-1' },
        },
        data: { isActive: false },
      });

      expect(mockFXRateUpdateMany).toHaveBeenNthCalledWith(2, {
        where: {
          fromCurrencyId: 'curr-2',
          toCurrencyId: 'curr-1',
          isActive: true,
          id: { not: 'rate-1-inv-old' },
        },
        data: { isActive: false },
      });

      expect(result.id).toEqual('rate-1');
    });
  });

  describe('findAll', () => {
    it('should query filtering by isActive status correctly', async () => {
      mockFXRateFindMany.mockResolvedValueOnce([]);

      await controller.findAll({ isActive: 'true' });

      expect(mockFXRateFindMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
        },
        orderBy: {
          effectiveFrom: 'desc',
        },
        include: {
          fromCurrency: true,
          toCurrency: true,
        },
      });
    });
  });
});
