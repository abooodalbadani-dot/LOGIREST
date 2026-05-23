/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseLockController } from './warehouse-lock.controller';
import { WarehouseLockService } from './warehouse-lock.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { Request } from 'express';

describe('WarehouseLockController', () => {
  let controller: WarehouseLockController;

  const mockWarehouseLockService = {
    forceUnlock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WarehouseLockController],
      providers: [
        { provide: WarehouseLockService, useValue: mockWarehouseLockService },
      ],
    }).compile();

    controller = module.get<WarehouseLockController>(WarehouseLockController);
    jest.clearAllMocks();
  });

  const mockRequest = (ip = '127.0.0.1') => {
    return {
      ip,
    } as unknown as Request;
  };

  it('should throw ForbiddenException if user role is not admin', async () => {
    const req = mockRequest();
    await expect(
      controller.forceUnlock(
        'lock-1',
        'user-1',
        'PROC_OFFICER',
        { reason_notes: 'Some long enough reason notes' },
        req,
      ),
    ).rejects.toThrow(new ForbiddenException('Forbidden resource'));

    expect(mockWarehouseLockService.forceUnlock).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if reason_notes is missing', async () => {
    const req = mockRequest();
    await expect(
      controller.forceUnlock(
        'lock-1',
        'admin-1',
        'ADMIN',
        undefined as any,
        req,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if reason_notes is too short', async () => {
    const req = mockRequest();
    await expect(
      controller.forceUnlock(
        'lock-1',
        'admin-1',
        'ADMIN',
        { reason_notes: 'short' },
        req,
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'reason_notes must be longer than or equal to 10 characters',
      ),
    );
  });

  it('should call service forceUnlock if role is ADMIN and reason notes are valid', async () => {
    const req = mockRequest('192.168.1.1');
    const mockResult = { id: 'lock-1', isActive: false };
    mockWarehouseLockService.forceUnlock.mockResolvedValue(mockResult);

    const result = await controller.forceUnlock(
      'lock-1',
      'admin-1',
      'ADMIN',
      { reason_notes: 'This is a long enough note' },
      req,
    );

    expect(result).toEqual(mockResult);
    expect(mockWarehouseLockService.forceUnlock).toHaveBeenCalledWith(
      'lock-1',
      'admin-1',
      'This is a long enough note',
      '192.168.1.1',
    );
  });
});
